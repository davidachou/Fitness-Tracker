"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Filter, List } from "lucide-react";

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

type ContributorRow = {
  client_id: string;
  client_name: string;
  archived: boolean;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const cleanAvatar = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "null" || lower === "undefined") return "";
  return trimmed;
};

export default function ProjectsPage() {
  const [clientTeams, setClientTeams] = useState<ClientTeam[]>([]);
  const [hideArchived, setHideArchived] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("client_contributors");
      if (error) {
        console.error("client_contributors error", error);
        return;
      }

      const aggregates = new Map<string, ClientTeam>();

      (data as ContributorRow[] | null)?.forEach((row) => {
        const clientId = row.client_id;
        const clientName = row.client_name || "Client";
        const clientArchived = Boolean(row.archived);
        const personId = row.user_id;
        const personName = row.full_name || "Teammate";
        const avatar = cleanAvatar(row.avatar_url) || `/team/${personName}.png`;

        if (!aggregates.has(clientId)) {
          aggregates.set(clientId, {
            clientId,
            clientName,
            archived: clientArchived,
            people: [],
          });
        }
        const entry = aggregates.get(clientId)!;
        const already = entry.people.find((p) => p.id === personId);
        if (!already) {
          entry.people.push({ id: personId, name: personName, avatar });
        }
      });

      const sorted = Array.from(aggregates.values()).sort((a, b) =>
        a.clientName.localeCompare(b.clientName),
      );
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
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Projects</p>
        <h2 className="text-3xl font-black">Who’s working with each client</h2>
        <p className="text-muted-foreground">
          Team list is derived from logged time against each client (directly or via a project).
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant={hideArchived ? "secondary" : "outline"}
            size="sm"
            onClick={() => setHideArchived((v) => !v)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {hideArchived ? "Showing active" : "Including archived"}
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
              No clients to show yet. Log time to appear here.
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
                      {client.people.length} teammate{client.people.length === 1 ? "" : "s"}
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
                <TableHead>People</TableHead>
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
                        {client.people.length === 0 && "No time logged"}
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
                    No clients to show yet. Log time to appear here.
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

