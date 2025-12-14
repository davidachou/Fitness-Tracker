"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Filter, List } from "lucide-react";
import { getAvatarUrl } from "@/lib/utils";

type ClientTeam = {
  clientId: string;
  clientName: string;
  archived: boolean;
  people: {
    id: string;
    name: string;
    avatar?: string;
  }[];
};


export default function ConnectionsPage() {
  const [clientTeams, setClientTeams] = useState<ClientTeam[]>([]);
  const [hideArchived, setHideArchived] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      console.log("Loading trainer-client relationships...");

      // Get all workout sessions
      const { data: allSessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("client_id, conducted_by");

      console.log("All sessions query result:", allSessions, "Error:", sessionsError);

      if (sessionsError) {
        console.error("Error loading workout sessions:", sessionsError);
        return;
      }

      // Filter out sessions for inactive clients
      const { data: inactiveClients, error: inactiveError } = await supabase
        .from("fitness_clients")
        .select("id")
        .eq("is_active", false);

      if (inactiveError) {
        console.error("Error getting inactive clients:", inactiveError);
        return;
      }

      const inactiveClientIds = new Set(inactiveClients?.map(c => c.id) || []);
      const sessions = allSessions?.filter(s => !inactiveClientIds.has(s.client_id)) || [];

      console.log("Sessions query result:", sessions, "Error:", sessionsError);

      if (sessionsError) {
        console.error("Error loading workout sessions:", sessionsError);
        return;
      }

      // Get unique trainer IDs and client IDs
      const trainerIds = [...new Set(sessions?.map(s => s.conducted_by).filter(Boolean) || [])];
      const clientIds = [...new Set(sessions?.map(s => s.client_id).filter(Boolean) || [])];

      console.log("Trainer IDs:", trainerIds);
      console.log("Client IDs:", clientIds);

      // Get trainer profiles
      const { data: trainers, error: trainersError } = trainerIds.length > 0 ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", trainerIds) : { data: [], error: null };

      console.log("Trainers query result:", trainers, "Error:", trainersError);

      // Get client details
      const { data: clients, error: clientsError } = clientIds.length > 0 ? await supabase
        .from("fitness_clients")
        .select("id, name")
        .in("id", clientIds)
        .eq("is_active", true) : { data: [], error: null };

      console.log("Clients query result:", clients, "Error:", clientsError);

      if (trainersError || clientsError) {
        console.error("Error loading profiles:", trainersError || clientsError);
        return;
      }

      // Create lookup maps
      const trainerMap = new Map(trainers?.map(t => [t.id, t]) || []);
      const clientMap = new Map(clients?.map(c => [c.id, c]) || []);

      const aggregates = new Map<string, ClientTeam>();

      // Process sessions and build relationships
      sessions?.forEach((session: unknown) => {
        console.log("Processing session:", session);
        const clientId = (session as any).client_id; // eslint-disable-line @typescript-eslint/no-explicit-any
        const trainerId = (session as any).conducted_by; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (!clientId || !trainerId) return;

        const client = clientMap.get(clientId);
        const trainer = trainerMap.get(trainerId);

        if (!client || !trainer) return;

        const clientName = client.name;
        const trainerName = trainer.full_name || "Trainer";
        const avatar = getAvatarUrl(trainerName, trainer.avatar_url);

        console.log(`Client: ${clientName} (${clientId}), Trainer: ${trainerName} (${trainerId})`);

        if (!aggregates.has(clientId)) {
          aggregates.set(clientId, {
            clientId,
            clientName,
            archived: false,
            people: [],
          });
        }

        const entry = aggregates.get(clientId)!;
        const already = entry.people.find((p) => p.id === trainerId);
        if (!already) {
          entry.people.push({ id: trainerId, name: trainerName, avatar });
          console.log(`Added trainer ${trainerName} to client ${clientName}`);
        }
      });

      const sorted = Array.from(aggregates.values()).sort((a, b) =>
        a.clientName.localeCompare(b.clientName),
      );

      console.log("Final client teams:", sorted);
      setClientTeams(sorted);
    };

    load();
  }, [supabase]);

  const visibleClients = useMemo(
    () => (hideArchived ? clientTeams.filter((c) => !c.archived) : clientTeams),
    [clientTeams, hideArchived],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Relationships</p>
        <h2 className="text-3xl font-black">Trainer-Client Connections</h2>
        <p className="text-muted-foreground">
          See which trainers have worked with each client based on completed workout sessions.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant={hideArchived ? "secondary" : "outline"}
            size="sm"
            onClick={() => setHideArchived((v) => !v)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {hideArchived ? "Active clients only" : "All clients"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Found {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"}.
          </div>
        </div>
      </header>

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Grid
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <List className="h-4 w-4" /> Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {visibleClients.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-muted-foreground">
              No trainer-client connections yet. Start conducting workouts to see relationships here.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleClients.map((client) => (
              <div
                key={client.clientId}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{client.clientName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {client.people.length} trainer{client.people.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {client.archived && (
                    <Badge variant="outline" className="border-white/30 text-xs text-muted-foreground">
                      Archived
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex -space-x-2 overflow-hidden">
                  {client.people.map((person) => (
                    <Avatar key={person.id} className="h-10 w-10 border-2 border-white/60">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback>
                        {person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="mt-3 text-sm text-muted-foreground leading-6">
                  {client.people.length === 0 ? (
                    <span>No time logged yet.</span>
                  ) : (
                    client.people.map((p, idx) => (
                      <span key={p.id}>
                        {p.name}
                        {idx < client.people.length - 1 ? " · " : ""}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="border border-white/10 bg-white/5 p-0 backdrop-blur">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Trainers</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleClients.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell className="font-semibold">{client.clientName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {client.people.map((person) => (
                          <Avatar key={person.id} className="h-8 w-8 border-2 border-white/50">
                            <AvatarImage src={person.avatar} />
                            <AvatarFallback>
                              {person.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.people.map((p, idx) => (
                          <span key={p.id}>
                            {p.name}
                            {idx < client.people.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        {client.people.length === 0 && "No workouts conducted"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.archived ? (
                      <Badge variant="outline" className="border-white/30 text-muted-foreground">
                        Archived
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-white/10">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No trainer-client connections yet. Start conducting workouts to see relationships here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}