"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";
import { Users, BarChart3, TrendingUp, Calendar, Dumbbell, Target, Clock } from "lucide-react";
import { format, subDays, subWeeks, startOfWeek, endOfWeek } from "date-fns";

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

type ExerciseProgress = {
  exerciseName: string;
  plannedSets: number;
  actualSets: number;
  plannedReps: number;
  actualReps: number;
  plannedWeight: number;
  actualWeight: number;
  plannedTime: number;
  actualTime: number;
  sessions: number;
  adherence: number;
  setAdherence?: number;
  repAdherence?: number;
  weightAdherence?: number;
  timeAdherence?: number;
};

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { adminUIMode } = useAdminUIMode();

  const [user, setUser] = useState<User>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedExercise, setSelectedExercise] = useState<string>("");

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

  // Get user's fitness client profile (only if active)
  const clientQuery = useQuery({
    queryKey: ["fitness-client", user?.email],
    enabled: Boolean(user?.id && user?.email),
    queryFn: async (): Promise<FitnessClient | null> => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("email", user!.email!)
        .eq("is_active", true);

      if (error) {
        console.error('Analytics: Fitness client query error:', error);
        throw error;
      }

      // Handle the case where we get multiple or no results
      if (!data || data.length === 0) {
        return null;
      }
      if (data.length > 1) {
        console.warn('Analytics: Multiple fitness clients found for email:', user!.email, data);
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

  // Determine which client to show analytics for
  const currentClientId = isAdmin ? selectedClientId || clientQuery.data?.id : clientQuery.data?.id;
  const currentClient = isAdmin && selectedClientId
    ? allClientsQuery.data?.find(c => c.id === selectedClientId)
    : clientQuery.data;

  // Get workout sessions for analytics
  const sessionsQuery = useQuery({
    queryKey: ["workout-sessions-analytics", currentClientId, dateRange],
    enabled: Boolean(currentClientId),
    queryFn: async () => {
      let query = supabase
        .from("workout_sessions")
        .select(`
          id,
          started_at,
          completed_at,
          duration_seconds,
          status,
          template_name
        `)
        .eq("client_id", currentClientId!)
        .eq("status", "completed");

      // Apply date filter
      if (dateRange !== "all") {
        const days = parseInt(dateRange);
        const cutoffDate = subDays(new Date(), days);
        query = query.gte("started_at", cutoffDate.toISOString());
      }

      const { data, error } = await query.order("started_at", { ascending: true });

      if (error) throw error;

      // Normalize workout names (use template_name)
      return data.map(session => ({
        ...session,
        workouts: session.template_name ? [{ name: session.template_name }] : []
      }));
    },
  });

  // Get exercise logs for detailed analytics
  const exerciseLogsQuery = useQuery({
    queryKey: ["exercise-logs-analytics", currentClientId, dateRange],
    enabled: Boolean(currentClientId),
    queryFn: async () => {
      // First get session IDs for the current client within the date range
      let sessionsQuery = supabase
        .from("workout_sessions")
        .select("id")
        .eq("client_id", currentClientId!)
        .eq("status", "completed");

      // Apply date filter to sessions
      if (dateRange !== "all") {
        const days = parseInt(dateRange);
        const cutoffDate = subDays(new Date(), days);
        sessionsQuery = sessionsQuery.gte("started_at", cutoffDate.toISOString());
      }

      const { data: sessionData, error: sessionError } = await sessionsQuery;
      if (sessionError) throw sessionError;

      if (!sessionData || sessionData.length === 0) {
        return [];
      }

      const sessionIds = sessionData.map(s => s.id);

      // Now get exercise logs for those sessions
      const { data, error } = await supabase
        .from("exercise_logs")
        .select(`
          id,
          session_id,
          template_exercise_id,
          exercise_id,
          sets_completed,
          reps_completed,
          weight_used,
          time_completed,
          completed_at,
          planned_sets,
          planned_reps,
          planned_weight,
          planned_duration_seconds,
          exercise_name
        `)
        .in("session_id", sessionIds)
        .order("completed_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    if (!sessionsQuery.data) {
      return {
        totalWorkouts: 0,
        avgSessionTime: 0,
        weeklyFrequency: 0,
        uniqueExercises: 0,
      };
    }

    const totalWorkouts = sessionsQuery.data.length;
    const totalDuration = sessionsQuery.data.reduce((sum, session) => sum + (session.duration_seconds || 0), 0);
    const avgSessionTime = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts / 60) : 0;

    // Calculate weekly frequency based on actual workout history (not fixed 90 days)
    const ninetyDaysAgo = subDays(new Date(), 90);
    const allSessions = sessionsQuery.data;

    // Find the first workout date
    const firstWorkoutDate = allSessions.length > 0
      ? new Date(Math.min(...allSessions.map(s => new Date(s.started_at).getTime())))
      : new Date();

    // Use the shorter period: either from first workout, or last 90 days
    const analysisStartDate = firstWorkoutDate > ninetyDaysAgo ? firstWorkoutDate : ninetyDaysAgo;
    const relevantSessions = allSessions.filter(session =>
      new Date(session.started_at) >= analysisStartDate
    );

    // Calculate weeks in the analysis period
    const analysisPeriodDays = Math.max(1, (new Date().getTime() - analysisStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const analysisPeriodWeeks = Math.max(1, analysisPeriodDays / 7);
    const weeklyFrequency = relevantSessions.length / analysisPeriodWeeks;

    const uniqueExercises = exerciseLogsQuery.data
      ? new Set(exerciseLogsQuery.data.map(log => log.exercise_name)).size
      : 0;

    return {
      totalWorkouts,
      avgSessionTime,
      weeklyFrequency: Math.round(weeklyFrequency * 10) / 10, // Round to 1 decimal
      uniqueExercises,
    };
  }, [sessionsQuery.data, exerciseLogsQuery.data]);

  // Calculate workout frequency trend data (last 12 weeks)
  const trendData = useMemo(() => {
    if (!sessionsQuery.data || sessionsQuery.data.length === 0) return [];

    const weeks = [];
    const now = new Date();

    // Generate last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const workoutsInWeek = sessionsQuery.data.filter(session => {
        const sessionDate = new Date(session.started_at);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      }).length;

      const weekLabel = i === 0 ? 'This week' :
                       i === 1 ? 'Last week' :
                       `${12 - i}w ago`;

      weeks.push({
        weekStart,
        weekLabel,
        workouts: workoutsInWeek,
      });
    }

    return weeks;
  }, [sessionsQuery.data]);

  // Calculate session duration data for the last 20 sessions
  const durationData = useMemo(() => {
    if (!sessionsQuery.data) return [];

    const lastSessions = sessionsQuery.data.slice(-20); // Last 20 sessions
    return lastSessions.map((session, index) => ({
      session: `Session ${lastSessions.length - index}`, // Count backwards from most recent
      duration: Math.round((session.duration_seconds || 0) / 60), // Convert to minutes
      date: format(new Date(session.started_at), 'MMM dd'),
    })).reverse(); // Show oldest to newest
  }, [sessionsQuery.data]);

  // Calculate exercise analytics
  const exerciseAnalytics = useMemo(() => {
    if (!exerciseLogsQuery.data || exerciseLogsQuery.data.length === 0) {
      return { exerciseFrequency: [] as { name: string; count: number }[], exerciseProgress: [] };
    }

    // Exercise frequency
    const exerciseCount = exerciseLogsQuery.data.reduce((acc, log) => {
      if (log.exercise_name && log.exercise_name.trim()) { // Filter out blank/null exercise names
        acc[log.exercise_name] = (acc[log.exercise_name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const exerciseFrequency = Object.entries(exerciseCount)
      .map(([name, count]): { name: string; count: number } => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 exercises

    // Exercise progress (planned vs actual)
    const exerciseProgressMap = exerciseLogsQuery.data.reduce((acc, log) => {
      if (!log.exercise_name || !log.exercise_name.trim()) return acc;

      if (!acc[log.exercise_name]) {
        acc[log.exercise_name] = {
          name: log.exercise_name,
          plannedSets: 0,
          actualSets: 0,
          plannedReps: 0,
          actualReps: 0,
          plannedWeight: 0,
          actualWeight: 0,
          plannedTime: 0,
          actualTime: 0,
          sessions: 0,
          adherence: 0,
        };
      }

      acc[log.exercise_name].plannedSets += log.planned_sets || 0;
      acc[log.exercise_name].actualSets += log.sets_completed || 0;
      acc[log.exercise_name].plannedReps += log.planned_reps || 0;
      acc[log.exercise_name].actualReps += log.reps_completed || 0;
      acc[log.exercise_name].plannedWeight += log.planned_weight || 0;
      acc[log.exercise_name].actualWeight += log.weight_used || 0;
      acc[log.exercise_name].plannedTime += log.planned_duration_seconds || 0;
      acc[log.exercise_name].actualTime += log.time_completed || 0;
      acc[log.exercise_name].sessions += 1;

      return acc;
    }, {} as Record<string, { name: string; plannedSets: number; actualSets: number; plannedReps: number; actualReps: number; plannedWeight: number; actualWeight: number; plannedTime: number; actualTime: number; sessions: number; adherence: number }>);

    const exerciseProgress = Object.values(exerciseProgressMap)
      .map((exercise: Omit<ExerciseProgress, 'exerciseName' | 'adherence' | 'setAdherence' | 'repAdherence' | 'weightAdherence' | 'timeAdherence'>) => {
        // Determine if this is a time-based exercise (has time data)
        const isTimeBased = exercise.plannedTime > 0 || exercise.actualTime > 0;

        return {
          ...exercise,
          setAdherence: exercise.plannedSets > 0 ? (exercise.actualSets / exercise.plannedSets) * 100 : 0,
          repAdherence: isTimeBased ? null : (exercise.plannedReps > 0 ? (exercise.actualReps / exercise.plannedReps) * 100 : 0), // N/A for time-based
          timeAdherence: isTimeBased ? (exercise.plannedTime > 0 ? (exercise.actualTime / exercise.plannedTime) * 100 : 0) : null, // N/A for weight-based
          avgPlannedWeight: exercise.sessions > 0 ? exercise.plannedWeight / exercise.sessions : 0,
          avgActualWeight: exercise.sessions > 0 ? exercise.actualWeight / exercise.sessions : 0,
          avgPlannedTime: exercise.sessions > 0 ? exercise.plannedTime / exercise.sessions : 0,
          avgActualTime: exercise.sessions > 0 ? exercise.actualTime / exercise.sessions : 0,
          isTimeBased,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);

    return { exerciseFrequency, exerciseProgress };
  }, [exerciseLogsQuery.data]);

  // Calculate max weight records (for weight-based exercises)
  const maxWeightRecords = useMemo(() => {
    if (!exerciseLogsQuery.data) return [];

    const maxWeights = exerciseLogsQuery.data.reduce((acc, log) => {
      if (!log.weight_used || !log.exercise_name || !log.exercise_name.trim()) return acc; // Filter out blank/null exercise names

      if (!acc[log.exercise_name] || acc[log.exercise_name].weight < log.weight_used) {
        acc[log.exercise_name] = {
          exercise: log.exercise_name,
          weight: log.weight_used,
          date: format(new Date(log.completed_at), 'MMM dd, yyyy'),
          sets: log.sets_completed || 0,
          reps: log.reps_completed || 0,
        };
      }
      return acc;
    }, {} as Record<string, { exercise: string; weight: number; date: string; sets: number; reps: number }>);

    return Object.values(maxWeights)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10) as { exercise: string; weight: number; date: string; sets: number; reps: number }[];
  }, [exerciseLogsQuery.data]);

  // Calculate best time records (for time-based exercises)
  const bestTimeRecords = useMemo(() => {
    if (!exerciseLogsQuery.data) return [];

    const bestTimes = exerciseLogsQuery.data.reduce((acc, log) => {
      if (!log.time_completed || !log.exercise_name || !log.exercise_name.trim()) return acc; // Filter out blank/null exercise names

      if (!acc[log.exercise_name] || acc[log.exercise_name].time < log.time_completed) {
        acc[log.exercise_name] = {
          exercise: log.exercise_name,
          time: log.time_completed,
          date: format(new Date(log.completed_at), 'MMM dd, yyyy'),
          sets: log.sets_completed || 0,
          reps: log.reps_completed || 0,
        };
      }
      return acc;
    }, {} as Record<string, { exercise: string; time: number; date: string; sets: number; reps: number }>);

    return Object.values(bestTimes)
      .sort((a, b) => b.time - a.time)
      .slice(0, 10) as { exercise: string; time: number; date: string; sets: number; reps: number }[];
  }, [exerciseLogsQuery.data]);

  // Calculate detailed analytics for selected exercise
  const selectedExerciseAnalytics = useMemo(() => {
    if (!exerciseLogsQuery.data || !selectedExercise) {
      return {
        history: [],
        recentSessions: [],
        progressOverTime: [],
        adherenceStats: { setAdherence: 0, repAdherence: 0, totalSessions: 0 },
        isTimeBased: false
      };
    }

    const exerciseLogs = exerciseLogsQuery.data.filter(log =>
      log.exercise_name === selectedExercise
    ).sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());

    // Determine if this is a time-based exercise (has time_completed data)
    const isTimeBased = exerciseLogs.some(log => log.time_completed && log.time_completed > 0);

    // Exercise history (last 20 sessions)
    const history = exerciseLogs.slice(-20).map(log => ({
      date: format(new Date(log.completed_at), 'MMM dd, yyyy'),
      weight: log.weight_used || 0,
      time: log.time_completed || 0,
      plannedWeight: log.planned_weight || 0,
      plannedTime: log.planned_duration_seconds || 0,
      sets: log.sets_completed || 0,
      plannedSets: log.planned_sets || 0,
      reps: log.reps_completed || 0,
      plannedReps: log.planned_reps || 0,
      adherence: {
        sets: log.planned_sets ? Math.round((log.sets_completed || 0) / log.planned_sets * 100) : 100,
        reps: log.planned_reps ? Math.round((log.reps_completed || 0) / log.planned_reps * 100) : 100,
        weight: log.planned_weight && log.weight_used ?
          Math.round(Math.min(log.weight_used / log.planned_weight, 1) * 100) : 100,
        time: log.planned_duration_seconds && log.time_completed ?
          Math.round(Math.min(log.time_completed / log.planned_duration_seconds, 1) * 100) : 100
      }
    }));

    // Recent sessions (last 10)
    const recentSessions = history.slice(-10);

    // Progress over time (weight or time progression based on exercise type)
    const progressOverTime = history.map((session, index) => ({
      session: index + 1,
      weight: session.weight,
      time: session.time,
      plannedWeight: session.plannedWeight,
      plannedTime: session.plannedTime,
      date: session.date,
      value: isTimeBased ? session.time : session.weight,
      plannedValue: isTimeBased ? session.plannedTime : session.plannedWeight
    }));

    // Adherence statistics
    const totalSessions = exerciseLogs.length;
    const totalPlannedSets = exerciseLogs.reduce((sum, log) => sum + (log.planned_sets || 0), 0);
    const totalActualSets = exerciseLogs.reduce((sum, log) => sum + (log.sets_completed || 0), 0);
    const totalPlannedReps = exerciseLogs.reduce((sum, log) => sum + (log.planned_reps || 0), 0);
    const totalActualReps = exerciseLogs.reduce((sum, log) => sum + (log.reps_completed || 0), 0);

    const setAdherence = totalPlannedSets > 0 ? Math.round((totalActualSets / totalPlannedSets) * 100) : 100;
    const repAdherence = totalPlannedReps > 0 ? Math.round((totalActualReps / totalPlannedReps) * 100) : 100;

    // Calculate time adherence for time-based exercises
    let timeAdherence = 100;
    if (isTimeBased) {
      const totalPlannedTime = exerciseLogs.reduce((sum, log) => sum + (log.planned_duration_seconds || 0), 0);
      const totalActualTime = exerciseLogs.reduce((sum, log) => sum + (log.time_completed || 0), 0);
      timeAdherence = totalPlannedTime > 0 ? Math.round((totalActualTime / totalPlannedTime) * 100) : 100;
    }

    return {
      history,
      recentSessions,
      progressOverTime,
      adherenceStats: { setAdherence, repAdherence, timeAdherence, totalSessions },
      isTimeBased
    };
  }, [exerciseLogsQuery.data, selectedExercise]);

  // Calculate workout plan analytics
  const workoutPlanAnalytics = useMemo(() => {
    if (!sessionsQuery.data) return { workoutDistribution: [], recentWorkouts: [] };

    // Workout distribution
    const workoutCount = sessionsQuery.data.reduce((acc, session) => {
      const workoutName = session.workouts?.[0]?.name || 'Unknown Workout';
      acc[workoutName] = (acc[workoutName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const workoutDistribution = Object.entries(workoutCount)
      .map(([name, count]): { name: string; count: number; percentage: number } => ({
        name: name as string,
        count: count as number,
        percentage: Math.round((count as number / sessionsQuery.data!.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Recent workout history
    const recentWorkouts = sessionsQuery.data
      .slice(-10)
      .reverse()
      .map(session => ({
        name: session.workouts?.[0]?.name || 'Unknown Workout',
        date: format(new Date(session.started_at), 'MMM dd, yyyy'),
        duration: Math.round((session.duration_seconds || 0) / 60),
      }));

    return { workoutDistribution, recentWorkouts };
  }, [sessionsQuery.data]);

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
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? `Welcome ${profile?.full_name}! View detailed analytics for your clients.`
                : `Welcome back, ${profile?.full_name || currentClient?.name}! Track your fitness progress.`
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
                  Select a client above to view their analytics.
                </p>
              )}
            </div>

            {currentClientId && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Time Range:</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Client Date Range Filter */}
        {!shouldShowAdminFeatures(isAdmin, adminUIMode) && currentClientId && (
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-medium">Time Range:</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {currentClientId && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="frequency" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Frequency
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Exercises
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>
                  High-level metrics and insights for {currentClient?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewMetrics.totalWorkouts}</div>
                      <p className="text-xs text-muted-foreground">Completed sessions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewMetrics.avgSessionTime}</div>
                      <p className="text-xs text-muted-foreground">Minutes per session</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Weekly Frequency</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewMetrics.weeklyFrequency}</div>
                      <p className="text-xs text-muted-foreground">Workouts per week</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Exercise Variety</CardTitle>
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewMetrics.uniqueExercises}</div>
                      <p className="text-xs text-muted-foreground">Unique exercises</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frequency" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Workout Trend</CardTitle>
                  <CardDescription>
                    Your workout consistency over the last 12 weeks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsQuery.isLoading ? (
                    <p>Loading trend data...</p>
                  ) : trendData.length > 0 ? (
                    <div className="space-y-3">
                      {trendData.slice(-12).map((week, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="w-20 text-muted-foreground">
                            {week.weekLabel}
                          </span>
                          <div className="flex-1 mx-4">
                            <div className="bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all duration-300"
                                style={{ width: `${Math.min((week.workouts / 7) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right font-medium">{week.workouts}</span>
                            <span className="text-xs text-muted-foreground">workouts</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs text-muted-foreground mt-4">
                        <span>Less consistent</span>
                        <span>More consistent</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No trend data available yet. Complete more workouts to see your pattern!</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Session Duration</CardTitle>
                  <CardDescription>
                    Track workout session lengths over time (last 20 sessions)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsQuery.isLoading ? (
                    <p>Loading duration data...</p>
                  ) : durationData.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const maxDuration = Math.max(...durationData.map(d => d.duration), 30); // minimum 30min for scale
                        return (
                          <>
                            {durationData.map((session, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="w-20 truncate">{session.session}</span>
                                <div className="flex-1 mx-4">
                                  <div className="bg-muted rounded-full h-3">
                                    <div
                                      className="bg-green-500 rounded-full h-3 transition-all duration-300"
                                      style={{ width: `${(session.duration / maxDuration) * 100}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="w-12 text-right">{session.duration}min</span>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground mt-4">
                              Session duration • Bar length relative to your longest session ({maxDuration}min)
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No session duration data available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-4">
            {/* Exercise Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Exercise for Detailed Analytics</CardTitle>
                <CardDescription>
                  Choose a specific exercise to see detailed performance analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    <span className="text-sm font-medium">Exercise:</span>
                  </div>
                  <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select an exercise to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      {(exerciseAnalytics.exerciseFrequency as { name: string; count: number }[]).map((exercise, index: number) => (
                        <SelectItem key={index} value={exercise.name}>
                          {exercise.name} ({exercise.count} sessions)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedExercise && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExercise("")}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedExercise ? (
              /* Detailed Exercise Analytics */
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedExercise} Progress</CardTitle>
                      <CardDescription>
                        {selectedExerciseAnalytics.isTimeBased ? 'Time progression' : 'Weight progression'} over time ({selectedExerciseAnalytics.adherenceStats.totalSessions} sessions)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedExerciseAnalytics.progressOverTime.length > 0 ? (
                        <div className="space-y-2">
                          {selectedExerciseAnalytics.progressOverTime.slice(-10).map((session, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="w-16">{session.session}</span>
                              <div className="flex-1 mx-4">
                                <div className="bg-muted rounded-full h-2">
                                  <div
                                    className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                                    style={{
                                      width: `${Math.min((session.value / Math.max(...selectedExerciseAnalytics.progressOverTime.map(s => s.value || 1))) * 100, 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="w-16 text-right">
                                {selectedExerciseAnalytics.isTimeBased
                                  ? `${Math.floor(session.time / 60)}:${(session.time % 60).toString().padStart(2, '0')}`
                                  : session.weight > 0 ? `${session.weight}lbs` : 'Bodyweight'
                                }
                              </span>
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground mt-4">
                            {selectedExerciseAnalytics.isTimeBased ? 'Time progression' : 'Weight progression'} • Most recent sessions shown
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No progress data available.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>
                        Overall adherence for {selectedExercise}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Set Completion</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            selectedExerciseAnalytics.adherenceStats.setAdherence >= 90 ? 'bg-green-100 text-green-800' :
                            selectedExerciseAnalytics.adherenceStats.setAdherence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedExerciseAnalytics.adherenceStats.setAdherence}%
                          </span>
                        </div>
                        {selectedExerciseAnalytics.isTimeBased ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Rep Completion</span>
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">N/A</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Rep Completion</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              selectedExerciseAnalytics.adherenceStats.repAdherence >= 90 ? 'bg-green-100 text-green-800' :
                              selectedExerciseAnalytics.adherenceStats.repAdherence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedExerciseAnalytics.adherenceStats.repAdherence}%
                            </span>
                          </div>
                        )}
                        {selectedExerciseAnalytics.isTimeBased ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Time Completion</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              (selectedExerciseAnalytics.adherenceStats.timeAdherence ?? 0) >= 90 ? 'bg-green-100 text-green-800' :
                              (selectedExerciseAnalytics.adherenceStats.timeAdherence ?? 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedExerciseAnalytics.adherenceStats.timeAdherence ?? 0}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Time Completion</span>
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">N/A</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Sessions</span>
                          <span className="text-sm font-bold">
                            {selectedExerciseAnalytics.adherenceStats.totalSessions}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sessions - {selectedExercise}</CardTitle>
                    <CardDescription>
                      Latest workout sessions with planned vs actual performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedExerciseAnalytics.recentSessions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Date</th>
                              <th className="text-center py-2">Planned</th>
                              <th className="text-center py-2">Actual</th>
                              <th className="text-center py-2">{selectedExerciseAnalytics.isTimeBased ? 'Time' : 'Weight'}</th>
                              <th className="text-center py-2">Adherence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedExerciseAnalytics.recentSessions.map((session, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2">{session.date}</td>
                                <td className="text-center py-2">
                                  {selectedExerciseAnalytics.isTimeBased ? '1×1' : `${session.plannedSets}×${session.plannedReps}`}
                                </td>
                                <td className="text-center py-2">
                                  {selectedExerciseAnalytics.isTimeBased ? '1×1' : `${session.sets}×${session.reps}`}
                                </td>
                                <td className="text-center py-2">
                                  {selectedExerciseAnalytics.isTimeBased
                                    ? `${Math.floor(session.time / 60)}:${(session.time % 60).toString().padStart(2, '0')}`
                                    : session.weight > 0 ? `${session.weight}lbs` : 'Bodyweight'
                                  }
                                </td>
                                <td className="text-center py-2">
                                  <div className="space-y-1">
                                    <div className={`text-xs px-1 py-0.5 rounded ${
                                      session.adherence.sets >= 90 ? 'bg-green-100 text-green-800' :
                                      session.adherence.sets >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      Sets: {session.adherence.sets}%
                                    </div>
                                    {selectedExerciseAnalytics.isTimeBased ? (
                                      <div className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                                        Reps: N/A
                                      </div>
                                    ) : (
                                      <div className={`text-xs px-1 py-0.5 rounded ${
                                        session.adherence.reps >= 90 ? 'bg-green-100 text-green-800' :
                                        session.adherence.reps >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        Reps: {session.adherence.reps}%
                                      </div>
                                    )}
                                    {selectedExerciseAnalytics.isTimeBased && (
                                      <div className={`text-xs px-1 py-0.5 rounded ${
                                        session.adherence.time >= 90 ? 'bg-green-100 text-green-800' :
                                        session.adherence.time >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        Time: {session.adherence.time}%
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No recent session data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Aggregate Exercise Analytics */
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Exercise Frequency</CardTitle>
                    <CardDescription>
                      Most performed exercises by {currentClient?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {exerciseLogsQuery.isLoading ? (
                      <p>Loading exercise data...</p>
                    ) : exerciseAnalytics.exerciseFrequency.length > 0 ? (
                      <div className="space-y-2">
                        {(exerciseAnalytics.exerciseFrequency as { name: string; count: number }[]).map((exercise, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="flex-1 truncate pr-2">{exercise.name}</span>
                            <div className="flex-1 mx-4">
                              <div className="bg-muted rounded-full h-3">
                                <div
                                  className="bg-yellow-500 rounded-full h-3 transition-all duration-300"
                                  style={{ width: `${Math.min((exercise.count / Math.max(...exerciseAnalytics.exerciseFrequency.map((e) => e.count))) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="w-8 text-right">{exercise.count}</span>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-4">
                          Exercise frequency • Bar length relative to most performed exercise
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No exercise data available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Personal Records Section */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Max Weight Records</CardTitle>
                      <CardDescription>
                        Personal best weights achieved
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exerciseLogsQuery.isLoading ? (
                        <p>Loading records...</p>
                      ) : maxWeightRecords.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {maxWeightRecords.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{record.exercise}</p>
                                <p className="text-sm text-muted-foreground">
                                  {record.sets}×{record.reps} • {record.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{record.weight}lbs</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No weight records available.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Best Time Records</CardTitle>
                      <CardDescription>
                        Personal best times achieved
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exerciseLogsQuery.isLoading ? (
                        <p>Loading records...</p>
                      ) : bestTimeRecords.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {bestTimeRecords.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{record.exercise}</p>
                                <p className="text-sm text-muted-foreground">
                                  {record.sets}×{record.reps} • {record.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{Math.floor(record.time / 60)}:{(record.time % 60).toString().padStart(2, '0')}</p>
                                <p className="text-xs text-muted-foreground">mm:ss</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No time records available.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Planned vs Actual Performance</CardTitle>
                <CardDescription>
                  How well {currentClient?.name} meets planned workout goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exerciseLogsQuery.isLoading ? (
                  <p>Loading performance data...</p>
                ) : exerciseAnalytics.exerciseProgress.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Exercise</th>
                          <th className="text-right py-2">Sessions</th>
                          <th className="text-right py-2">Avg Planned Weight</th>
                          <th className="text-right py-2">Avg Actual Weight</th>
                          <th className="text-right py-2">Avg Planned Time</th>
                          <th className="text-right py-2">Avg Actual Time</th>
                          <th className="text-right py-2">Set Adherence</th>
                          <th className="text-right py-2">Rep Adherence</th>
                          <th className="text-right py-2">Time Adherence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exerciseAnalytics.exerciseProgress.slice(0, 10).map((exercise, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 font-medium">{(exercise as any).name}</td> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                            <td className="text-right py-2">{exercise.sessions}</td>
                            <td className="text-right py-2">
                              {exercise.avgPlannedWeight > 0 ? `${Math.round(exercise.avgPlannedWeight)}lbs` : 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {exercise.avgActualWeight > 0 ? `${Math.round(exercise.avgActualWeight)}lbs` : 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {exercise.avgPlannedTime > 0 ? `${Math.floor(exercise.avgPlannedTime / 60)}:${(exercise.avgPlannedTime % 60).toString().padStart(2, '0')}` : 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              {exercise.avgActualTime > 0 ? `${Math.floor(exercise.avgActualTime / 60)}:${(exercise.avgActualTime % 60).toString().padStart(2, '0')}` : 'N/A'}
                            </td>
                            <td className="text-right py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                exercise.setAdherence >= 90 ? 'bg-green-100 text-green-800' :
                                exercise.setAdherence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {Math.round(exercise.setAdherence)}%
                              </span>
                            </td>
                            <td className="text-right py-2">
                              {exercise.repAdherence === null ? (
                                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">N/A</span>
                              ) : (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  exercise.repAdherence >= 90 ? 'bg-green-100 text-green-800' :
                                  exercise.repAdherence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {Math.round(exercise.repAdherence)}%
                                </span>
                              )}
                            </td>
                            <td className="text-right py-2">
                              {exercise.timeAdherence === null ? (
                                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">N/A</span>
                              ) : (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  exercise.timeAdherence >= 90 ? 'bg-green-100 text-green-800' :
                                  exercise.timeAdherence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {Math.round(exercise.timeAdherence)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No performance data available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Workout Plan Distribution</CardTitle>
                  <CardDescription>
                    How often {currentClient?.name} performs different workout plans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsQuery.isLoading ? (
                    <p>Loading workout data...</p>
                  ) : workoutPlanAnalytics.workoutDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {workoutPlanAnalytics.workoutDistribution.map((workout, index) => {
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500'];
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`} />
                              <span className="font-medium">{workout.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{workout.count} sessions</span>
                              <span className="text-sm font-bold">{workout.percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground mt-4">
                        Workout plan distribution • Percentage of total sessions
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No workout plan data available.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Workout History</CardTitle>
                  <CardDescription>
                    Latest completed workout sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsQuery.isLoading ? (
                    <p>Loading history...</p>
                  ) : workoutPlanAnalytics.recentWorkouts.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {workoutPlanAnalytics.recentWorkouts.map((workout, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{workout.name}</p>
                            <p className="text-sm text-muted-foreground">{workout.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{workout.duration}min</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No recent workouts available.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Consistency Metrics</CardTitle>
                <CardDescription>
                  Track workout consistency and adherence patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {overviewMetrics.weeklyFrequency >= 3 ? 'Excellent' :
                       overviewMetrics.weeklyFrequency >= 2 ? 'Good' :
                       overviewMetrics.weeklyFrequency >= 1 ? 'Fair' : 'Needs Improvement'}
                    </div>
                    <p className="text-sm text-muted-foreground">Consistency Rating</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {Math.round((sessionsQuery.data?.filter(s => s.duration_seconds && s.duration_seconds >= 1800)?.length || 0) /
                        (sessionsQuery.data?.length || 1) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Sessions ≥ 30 minutes</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {workoutPlanAnalytics.workoutDistribution.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Active Workout Plans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
