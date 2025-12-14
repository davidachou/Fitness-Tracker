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
import { Dumbbell, Play, Clock, Calendar, Plus, Users, Edit, Trash2 } from "lucide-react";

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

type WorkoutTemplate = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  fitness_clients: { name: string }[];
  template_exercises: Array<{
    id: string;
    sets: number;
    reps: number;
    duration_seconds?: number;
    weight?: number;
    exercises: {
      id: string;
      name: string;
      category: string;
      difficulty: string;
      is_time_based: boolean;
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
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log('Loaded user:', user?.email);
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

  // Get user's fitness client profile (only if active)
  const clientQuery = useQuery({
    queryKey: ["fitness-client", user?.email],
    enabled: Boolean(user?.id && user?.email),
    queryFn: async (): Promise<FitnessClient | null> => {
      console.log('Querying fitness_clients with email:', user!.email);
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("email", user!.email!)
        .eq("is_active", true);

      if (error) {
        console.error('Fitness client query error:', error);
        throw error;
      }

      // Handle the case where we get multiple or no results
      if (!data || data.length === 0) {
        return null;
      }
      if (data.length > 1) {
        console.warn('Multiple fitness clients found for email:', user!.email, data);
        // Return the first one or handle as needed
        return data[0];
      }
      return data[0];
    },
  });

  // Set default selected client for admins
  useEffect(() => {
    if (isAdmin && clientQuery.data?.id && !selectedClientId) {
      setSelectedClientId(clientQuery.data.id);
    }
  }, [isAdmin, clientQuery.data?.id, selectedClientId]);

  // Get all ACTIVE fitness clients (for admin client selector)
  const allClientsQuery = useQuery({
    queryKey: ["all-fitness-clients"],
    enabled: Boolean(isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FitnessClient[];
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
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select(`
          id,
          name,
          description,
          created_at,
          fitness_clients!inner(name),
          template_exercises(
            id,
            sets,
            reps,
            duration_seconds,
            weight,
            exercises(
              id,
              name,
              category,
              difficulty,
              is_time_based
            )
          )
        `)
        .eq("client_id", currentClientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as WorkoutTemplate[];
    },
  });

  // Get active workout session for current workout (if any)
  const activeSessionQuery = useQuery({
    queryKey: ["active-session-for-workout", currentClientId],
    enabled: Boolean(currentClientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, template_id")
        .eq("client_id", currentClientId!)
        .eq("status", "in_progress");

      if (error) throw error;
      return data || [];
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
          template_name,
          fitness_clients!inner(name)
        `)
        .eq("client_id", currentClientId!)
        .neq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      // Transform to match expected format
      return (data as unknown[]).map(session => ({
        ...(session as object),
        workouts: [{ name: (session as any).template_name }] // eslint-disable-line @typescript-eslint/no-explicit-any
      })) as WorkoutSession[];
    },
  });

  const startWorkoutMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id || !currentClientId) throw new Error("Missing user data");

      // Get template data
      const { data: template, error: templateError } = await supabase
        .from("workout_templates")
        .select(`
          id,
          name,
          description,
          template_exercises(
            exercise_id,
            exercises!inner(name),
            sets,
            reps,
            duration_seconds,
            weight,
            rest_seconds,
            notes
          )
        `)
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Create session using new schema
      const sessionData = {
        client_id: currentClientId,
        conducted_by: user.id,
        template_id: templateId,
        template_name: template.name
      };

      console.log('Session data to insert:', sessionData);

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert(sessionData)
        .select("id")
        .single();

      if (error) {
        console.error('Session creation failed:', {
          templateId,
          templateData: template,
          currentClientId,
          userId: user.id,
          error
        });
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("Workout started!");
      queryClient.invalidateQueries({ queryKey: ["active-session-for-workout", currentClientId] });
      // Automatically open the session dialog
      setActiveSessionId(data.id);
      setSessionDialogOpen(true);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not start workout"),
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("workout_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workout deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts", currentClientId] });
      setDeletingWorkoutId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete workout");
      setDeletingWorkoutId(null);
    },
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

  if (isAdmin && !currentClientId && allClientsQuery.data?.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No Active Clients</CardTitle>
            <CardDescription>
              There are no active fitness clients in the system. Create a fitness client profile first.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fitness</h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? `Welcome ${profile?.full_name}! Manage your clients' fitness programs here.`
                : `Welcome back, ${profile?.full_name || currentClient?.name}! Track your workouts and progress.`
              }
            </p>
          </div>
        </div>

        {/* Admin Controls */}
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <div className="flex items-center justify-between gap-4">
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
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!currentClientId && allClientsQuery.data && allClientsQuery.data.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Select a client above to view their workouts and progress.
                </p>
              )}
            </div>

            {currentClientId && (
              <Button onClick={() => setWorkoutDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workout
              </Button>
            )}
          </div>
        )}
      </div>

      {currentClientId && (
        <Tabs defaultValue="library" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Workout Library
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
                  {workoutsQuery.data?.map((workout) => {
                    const activeSession = activeSessionQuery.data?.find(s => s.template_id === workout.id);
                    const isInProgress = !!activeSession;

                    return (
                      <Card key={workout.id} className={`hover:shadow-md transition-shadow ${isInProgress ? 'border-primary/50 bg-primary/5' : ''}`}>
                        <CardHeader className="pb-3">
                          {isInProgress && (
                            <div className="flex justify-end mb-2">
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg truncate">{workout.name}</CardTitle>
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
                            {workout.template_exercises.slice(0, 3).map((exercise) => (
                              <div key={exercise.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{exercise.exercises.name}</span>
                                <div className="flex gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {exercise.sets}×{exercise.exercises.is_time_based ? `${exercise.duration_seconds || 30}sec` : exercise.reps}
                                  </Badge>
                                  {exercise.weight && !exercise.exercises.is_time_based && (
                                    <Badge variant="outline" className="text-xs">
                                      {exercise.weight}lbs
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            {workout.template_exercises.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{workout.template_exercises.length - 3} more exercises
                              </p>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <Button
                          className="w-full"
                          onClick={() => {
                            if (isInProgress && activeSession) {
                              // Resume existing session
                              setActiveSessionId(activeSession.id);
                              setSessionDialogOpen(true);
                            } else {
                              // Start new session
                              startWorkoutMutation.mutate(workout.id);
                            }
                          }}
                          disabled={startWorkoutMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {startWorkoutMutation.isPending ? "Starting..." : isInProgress ? "Resume Workout" : "Start Workout"}
                        </Button>
                        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setEditingWorkoutId(workout.id);
                                setWorkoutDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${workout.name}"? This will remove the workout template but keep all historical workout sessions.`)) {
                                  setDeletingWorkoutId(workout.id);
                                  deleteWorkoutMutation.mutate(workout.id);
                                }
                              }}
                              disabled={deleteWorkoutMutation.isPending && deletingWorkoutId === workout.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
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
      )}

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
