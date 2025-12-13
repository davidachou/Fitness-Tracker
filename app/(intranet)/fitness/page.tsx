"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";
import { WorkoutFormDialog } from "@/components/fitness/WorkoutFormDialog";
import { WorkoutSessionDialog } from "@/components/fitness/WorkoutSessionDialog";
import { Dumbbell, Play, Clock, Calendar, Plus, Users } from "lucide-react";

type User = { id: string; email?: string } | null;

type Profile = {
  id: string;
  full_name: string | null;
  is_admin: boolean;
};

type FitnessClient = {
  id: string;
  name: string;
  email?: string;
};

type Workout = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  fitness_clients: { name: string }[];
  workout_exercises: Array<{
    id: string;
    sets: number;
    reps: number;
    weight?: number;
    exercises: {
      id: string;
      name: string;
      category: string;
      difficulty: string;
    };
  }>;
};

type WorkoutSession = {
  id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  duration_seconds?: number;
  workouts: {
    name: string;
    fitness_clients: { name: string }[];
  }[];
};

export default function FitnessPage() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { adminUIMode } = useAdminUIMode();

  const [user, setUser] = useState<User>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | undefined>();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, is_admin")
          .eq("id", user.id)
          .single();
        setProfile(profile);
        setIsAdmin(Boolean(profile?.is_admin));
      }
    };
    loadUser();
  }, [supabase]);

  // Get user's fitness client profile
  const clientQuery = useQuery({
    queryKey: ["fitness-client", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FitnessClient | null> => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("email", user!.email)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data || null;
    },
  });

  // Set default selected client for admins
  useEffect(() => {
    if (isAdmin && clientQuery.data?.id && !selectedClientId) {
      setSelectedClientId(clientQuery.data.id);
    }
  }, [isAdmin, clientQuery.data?.id, selectedClientId]);

  // Get all fitness clients (for admin client selector)
  const allClientsQuery = useQuery({
    queryKey: ["all-fitness-clients"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data as FitnessClient[];
    },
  });

  // Get profiles lookup for display names
  const profilesLookupQuery = useQuery({
    queryKey: ["profiles-lookup"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name");
      if (error) throw error;
      return data.reduce((acc, profile) => {
        acc[profile.email] = profile.full_name;
        return acc;
      }, {} as Record<string, string | null>);
    },
  });

  // Determine which client to show workouts for
  const currentClientId = isAdmin ? selectedClientId || clientQuery.data?.id : clientQuery.data?.id;
  const currentClient = isAdmin && selectedClientId
    ? allClientsQuery.data?.find(c => c.id === selectedClientId)
    : clientQuery.data;

  // Get workouts for selected/current client
  const workoutsQuery = useQuery({
    queryKey: ["workouts", currentClientId],
    enabled: Boolean(currentClientId),
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          id,
          name,
          description,
          created_at,
          fitness_clients!inner(name),
          workout_exercises(
            id,
            sets,
            reps,
            weight,
            exercises(
              id,
              name,
              category,
              difficulty
            )
          )
        `)
        .eq("client_id", currentClientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Workout[];
    },
  });

  // Get active workout sessions for selected/current client
  const activeSessionsQuery = useQuery({
    queryKey: ["active-sessions", currentClientId],
    enabled: Boolean(currentClientId),
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          started_at,
          completed_at,
          status,
          duration_seconds,
          workouts!inner(name, fitness_clients!inner(name))
        `)
        .eq("client_id", currentClientId!)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data as unknown as WorkoutSession[];
    },
  });

  // Get workout history for selected/current client
  const historyQuery = useQuery({
    queryKey: ["workout-history", currentClientId],
    enabled: Boolean(currentClientId),
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          started_at,
          completed_at,
          status,
          duration_seconds,
          workouts!inner(name, fitness_clients!inner(name))
        `)
        .eq("client_id", currentClientId!)
        .neq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as WorkoutSession[];
    },
  });

  const startWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user?.id || !currentClientId) throw new Error("Missing user data");

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          workout_id: workoutId,
          client_id: currentClientId,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Workout started!");
      queryClient.invalidateQueries({ queryKey: ["active-sessions", currentClientId] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not start workout"),
  });

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!isAdmin && !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No Fitness Profile Found</CardTitle>
            <CardDescription>
              It looks like you don&apos;t have a fitness client profile set up yet.
              Contact your trainer to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isAdmin && !currentClientId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select a Client</CardTitle>
            <CardDescription>
              Choose a client from the dropdown above to view their workouts and progress.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fitness</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || currentClient?.name}! Track your workouts and progress.
          </p>
        </div>

        {/* Client Selector for Admins */}
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Viewing:</span>
            </div>
            <Select
              value={selectedClientId || clientQuery.data?.id || ""}
              onValueChange={(value) => setSelectedClientId(value === clientQuery.data?.id ? null : value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {allClientsQuery.data?.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.email && profilesLookupQuery.data?.[client.email] || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <Button onClick={() => setWorkoutDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workout
          </Button>
        )}
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Workout Library
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Workouts</CardTitle>
              <CardDescription>
                Browse and start your assigned workout plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workoutsQuery.isLoading ? (
                <p>Loading workouts...</p>
              ) : workoutsQuery.data?.length === 0 ? (
                <p className="text-muted-foreground">No workouts assigned yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {workoutsQuery.data?.map((workout) => (
                    <Card key={workout.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{workout.name}</CardTitle>
                            {workout.description && (
                              <CardDescription className="mt-1">
                                {workout.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Exercises:</p>
                          <div className="space-y-1">
                            {workout.workout_exercises.slice(0, 3).map((exercise) => (
                              <div key={exercise.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{exercise.exercises.name}</span>
                                <div className="flex gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {exercise.sets}×{exercise.reps}
                                  </Badge>
                                  {exercise.weight && (
                                    <Badge variant="outline" className="text-xs">
                                      {exercise.weight}lbs
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            {workout.workout_exercises.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{workout.workout_exercises.length - 3} more exercises
                              </p>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <Button
                          className="w-full"
                          onClick={() => startWorkoutMutation.mutate(workout.id)}
                          disabled={startWorkoutMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {startWorkoutMutation.isPending ? "Starting..." : "Start Workout"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Workout Sessions</CardTitle>
              <CardDescription>
                Your currently running workout sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessionsQuery.isLoading ? (
                <p>Loading active sessions...</p>
              ) : activeSessionsQuery.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active workout sessions.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start a workout from your library to begin tracking.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessionsQuery.data?.map((session) => (
                    <Card key={session.id} className="border-primary/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{session.workouts[0]?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Started {new Date(session.started_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveSessionId(session.id);
                                setSessionDialogOpen(true);
                              }}
                            >
                              Continue
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workout History</CardTitle>
              <CardDescription>
                Your completed workout sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <p>Loading history...</p>
              ) : historyQuery.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No workout history yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete your first workout to see it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyQuery.data?.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{session.workouts[0]?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {session.completed_at
                                ? `Completed ${new Date(session.completed_at).toLocaleString()}`
                                : `Started ${new Date(session.started_at).toLocaleString()}`
                              }
                            </p>
                            {session.duration_seconds && (
                              <p className="text-sm text-muted-foreground">
                                Duration: {Math.round(session.duration_seconds / 60)} minutes
                              </p>
                            )}
                          </div>
                          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WorkoutFormDialog
        open={workoutDialogOpen}
        onClose={() => {
          setWorkoutDialogOpen(false);
          setEditingWorkoutId(undefined);
        }}
        workoutId={editingWorkoutId}
        defaultClientId={currentClientId}
      />

      <WorkoutSessionDialog
        sessionId={activeSessionId}
        open={sessionDialogOpen}
        onClose={() => {
          setSessionDialogOpen(false);
          setActiveSessionId(null);
        }}
      />
    </div>
  );
}
