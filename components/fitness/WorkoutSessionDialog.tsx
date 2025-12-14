"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  Play,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

type WorkoutSession = {
  id: string;
  template_id: string;
  started_at: string;
  status: string;
  workout_templates: {
    name: string;
    template_exercises: Array<{
      id: string;
      sets: number;
      reps: number;
      duration_seconds?: number;
      weight?: number;
      rest_seconds: number;
      notes?: string;
      exercises: {
        id: string;
        name: string;
        instructions?: string;
        is_time_based?: boolean;
      };
    }>;
  }[];
  workouts: {
    name: string;
    template_exercises: Array<{
      id: string;
      sets: number;
      reps: number;
      duration_seconds?: number;
      weight?: number;
      rest_seconds: number;
      notes?: string;
      exercises: {
        id: string;
        name: string;
        instructions?: string;
        is_time_based?: boolean;
      };
    }>;
  };
};

type ExerciseLog = {
  template_exercise_id: string;
  exercise_id: string;
  sets_completed: number;
  reps_completed: number;
  time_completed?: number;
  weight_used?: number;
  rest_time_seconds: number;
  notes?: string;
  // Planned values for historical accuracy
  planned_sets: number;
  planned_reps: number;
  planned_duration_seconds?: number;
  planned_weight?: number;
  planned_rest_seconds: number;
  exercise_name: string;
  is_time_based?: boolean;
};

type WorkoutSessionDialogProps = {
  sessionId: string | null;
  open: boolean;
  onClose: () => void;
};

const supabase = createClient();

export function WorkoutSessionDialog({ sessionId, open, onClose }: WorkoutSessionDialogProps) {
  const queryClient = useQueryClient();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [restTimer, setRestTimer] = useState<{ running: boolean; timeLeft: number; totalTime: number; startTime: number } | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState<{ running: boolean; elapsed: number; startTime: number } | null>(null);
  const [sessionStartTime] = useState(new Date());
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);

  // Reset workout state when starting a new session
  const prevSessionId = useRef<string | null>(null);
  useEffect(() => {
    if (sessionId && open && sessionId !== prevSessionId.current) {
      // Only reset when starting a new session (different sessionId)
      setCurrentExerciseIndex(0);
      setExerciseLogs({});
      setRestTimer(null);
      prevSessionId.current = sessionId;
    }
  }, [sessionId, open]);

  // Get session data
  const sessionQuery = useQuery({
    queryKey: ["workout-session", sessionId],
    enabled: Boolean(sessionId && open),
    queryFn: async () => {
      // Query session with template data
      const { data, error } = await supabase
            .from("workout_sessions")
            .select(`
              id,
              template_id,
              started_at,
              status,
              workout_templates(
                name,
                template_exercises(
                  id,
                  sets,
                  reps,
                  duration_seconds,
                  weight,
                  rest_seconds,
                  notes,
                  exercises(
                    id,
                    name,
                    instructions,
                    is_time_based
                  )
                )
              )
            `)
            .eq("id", sessionId)
            .single();

        if (error) {
          console.error('WorkoutSessionDialog: Query error:', error);
          throw error;
        }

      console.log('WorkoutSessionDialog: Raw session data from database:', data);

      // Transform to match component expectations
          // Supabase returns workout_templates as an object if there's one result, or array if multiple
          const workoutTemplates = Array.isArray(data.workout_templates)
            ? data.workout_templates
            : [data.workout_templates];

          const template = workoutTemplates[0];
          console.log('WorkoutSessionDialog: Session data:', data);
          console.log('WorkoutSessionDialog: workout_templates raw:', data.workout_templates);
          console.log('WorkoutSessionDialog: workout_templates normalized:', workoutTemplates);
          console.log('WorkoutSessionDialog: Template:', template);
          console.log('WorkoutSessionDialog: Template exercises:', template?.template_exercises);

          if (!template) {
            console.warn('WorkoutSessionDialog: No workout template found for session', data.id);
            return {
              ...data,
              workouts: {
                name: 'Unknown Workout',
                template_exercises: []
              }
            } as unknown as WorkoutSession;
          }

          return {
            ...data,
            workouts: {
              name: template.name || 'Unnamed Workout',
              template_exercises: template.template_exercises || []
            }
          } as unknown as WorkoutSession;

      throw new Error("Failed to load session data");
    },
  });

  const exercises = sessionQuery.data?.workouts.template_exercises || [];
  const currentExercise = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;

  // Debug logging
  console.log('WorkoutSessionDialog: exercises array:', exercises);
  console.log('WorkoutSessionDialog: currentExercise:', currentExercise);
  console.log('WorkoutSessionDialog: totalExercises:', totalExercises);
  const completedExercises = exercises.filter(ex =>
    exerciseLogs[ex.id]?.sets_completed >= ex.sets
  ).length;
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer?.running) {
      interval = setInterval(() => {
        setRestTimer(prev => prev ? {
          ...prev,
          timeLeft: prev.timeLeft - 1
        } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  // Exercise timer effect (for time-based exercises)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (exerciseTimer?.running) {
      interval = setInterval(() => {
        setExerciseTimer(prev => prev ? {
          ...prev,
          elapsed: Math.floor((Date.now() - prev.startTime) / 1000)
        } : null);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [exerciseTimer]);

  const startRestTimer = (seconds: number) => {
    setRestTimer({
      running: true,
      timeLeft: seconds,
      totalTime: seconds,
      startTime: Date.now()
    });
  };


  const resetRestTimer = () => {
    // If there was an active timer, record the actual rest time taken
    if (restTimer && currentExercise) {
      const actualRestTime = Math.round((Date.now() - restTimer.startTime) / 1000);
      updateExerciseLog(currentExercise.id, {
        rest_time_seconds: actualRestTime
      });

      // Check if this was the last set of the current exercise
      const currentLog = exerciseLogs[currentExercise.id];
      const wasLastSet = currentLog && currentLog.sets_completed >= currentExercise.sets;

      if (wasLastSet && currentExerciseIndex < exercises.length - 1) {
        // Move to next exercise after rest
        setTimeout(() => {
          setCurrentExerciseIndex(prev => prev + 1);
        }, 500);
        toast.success(`Rest completed! Moving to next exercise...`);
      } else {
        toast.success(`Rest completed! (${formatTime(actualRestTime - restTimer.totalTime)} extra)`);
      }
    }
    setRestTimer(null);
  };

  const startExerciseTimer = () => {
    if (currentExercise && currentExercise.exercises && currentExercise.exercises.name) {
      // Initialize the exercise log if it doesn't exist
      if (!exerciseLogs[currentExercise.id]) {
        updateExerciseLog(currentExercise.id, {
          template_exercise_id: currentExercise.id,
          exercise_id: currentExercise.exercises?.id,
          sets_completed: 0,
          reps_completed: currentExercise.exercises?.is_time_based ? undefined : 0,
          time_completed: currentExercise.exercises?.is_time_based ? (currentExercise.duration_seconds || 30) : undefined,
          weight_used: currentExercise.weight ? parseFloat(currentExercise.weight.toString()) : undefined,
          rest_time_seconds: 0,
          planned_sets: currentExercise.sets || 0,
          planned_reps: currentExercise.reps || 0,
          planned_duration_seconds: currentExercise.duration_seconds,
          planned_weight: currentExercise.weight ? parseFloat(currentExercise.weight.toString()) : undefined,
          planned_rest_seconds: currentExercise.rest_seconds || 0,
          exercise_name: currentExercise.exercises?.name,
          is_time_based: currentExercise.exercises?.is_time_based || false
        });
      }

      setExerciseTimer({
        running: true,
        elapsed: 0,
        startTime: Date.now()
      });
    }
  };

  const stopExerciseTimer = () => {
    if (exerciseTimer) {
      const actualTime = Math.floor((Date.now() - exerciseTimer.startTime) / 1000);
      setExerciseTimer(null);
      return actualTime;
    }
    return 0;
  };

  const updateExerciseLog = (exerciseId: string, updates: Partial<ExerciseLog>) => {
    setExerciseLogs(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        template_exercise_id: exerciseId,
        ...updates
      }
    }));
  };

  const completeSet = () => {
    if (!currentExercise || !currentExercise.exercises || !currentExercise.exercises.name) {
      console.error('Exercise data not available for completion', currentExercise);
      toast.error('Exercise data not loaded. Please refresh and try again.');
      return;
    }

    const currentLog = exerciseLogs[currentExercise.id] || {
      template_exercise_id: currentExercise.id,
      exercise_id: currentExercise.exercises?.id,
      sets_completed: 0,
      reps_completed: currentExercise.exercises?.is_time_based ? undefined : 0,
      time_completed: currentExercise.exercises?.is_time_based ? (currentExercise.duration_seconds || 30) : undefined,
      weight_used: currentExercise.weight ? parseFloat(currentExercise.weight.toString()) : undefined,
      rest_time_seconds: 0,
      // Planned values for historical accuracy - ensure they're never null
      planned_sets: currentExercise.sets || 0,
      planned_reps: currentExercise.reps || 0,
      planned_duration_seconds: currentExercise.duration_seconds || null,
      planned_weight: currentExercise.weight ? parseFloat(currentExercise.weight.toString()) : null,
      planned_rest_seconds: currentExercise.rest_seconds || 0,
      exercise_name: currentExercise.exercises?.name || 'Unknown Exercise',
      is_time_based: currentExercise.exercises?.is_time_based || false
    };

    // Handle time-based exercises differently
    if (currentExercise.exercises.is_time_based) {
      // If no timer is running and no time recorded, start the exercise
      if (!exerciseTimer && !currentLog.time_completed) {
        startExerciseTimer();
        return;
      }

      const newSetsCompleted = currentLog.sets_completed + 1;

      // If timer is running, stop it and complete the set
      if (exerciseTimer) {
        const actualTime = stopExerciseTimer();

        updateExerciseLog(currentExercise.id, {
          sets_completed: newSetsCompleted,
          time_completed: actualTime,
          weight_used: currentLog.weight_used || currentExercise.weight,
          rest_time_seconds: currentExercise.rest_seconds
        });

        // Always start rest timer after completing a set, unless it's the last set of the last exercise
        const isLastSetOfWorkout = newSetsCompleted >= currentExercise.sets && currentExerciseIndex >= exercises.length - 1;

        if (!isLastSetOfWorkout) {
          startRestTimer(currentExercise.rest_seconds);
        }

        // If this was the last set of the exercise, show completion message
        if (newSetsCompleted >= currentExercise.sets) {
          toast.success(`${currentExercise.exercises?.name || 'Exercise'} completed!`);
        }

        return;
      }

      // If no timer running but time already recorded, complete the set
      if (exerciseLogs[currentExercise.id]?.time_completed) {
        updateExerciseLog(currentExercise.id, {
          sets_completed: newSetsCompleted,
          weight_used: currentLog.weight_used || currentExercise.weight,
          rest_time_seconds: currentExercise.rest_seconds,
          // Clear time_completed for next set
          time_completed: undefined
        });

        // Always start rest timer after completing a set, unless it's the last set of the last exercise
        const isLastSetOfWorkout = newSetsCompleted >= currentExercise.sets && currentExerciseIndex >= exercises.length - 1;

        if (!isLastSetOfWorkout) {
          startRestTimer(currentExercise.rest_seconds);
        }

        // If this was the last set of the exercise, show completion message
        if (newSetsCompleted >= currentExercise.sets) {
          toast.success(`${currentExercise.exercises?.name || 'Exercise'} completed!`);
        }

        return;
      }

      // If no timer and no recorded time, start the exercise
      startExerciseTimer();
      toast.success(`Started ${currentExercise.exercises?.name || 'exercise'}! Timer running...`);
      return;
    }

    // Handle rep-based exercises (original logic)
    const newSetsCompleted = currentLog.sets_completed + 1;

    // Calculate actual rest time taken
    const actualRestTime = restTimer
      ? Math.round((Date.now() - restTimer.startTime) / 1000)
      : currentExercise.rest_seconds;

    updateExerciseLog(currentExercise.id, {
      sets_completed: newSetsCompleted,
      reps_completed: currentLog.reps_completed || currentExercise.reps,
      weight_used: currentLog.weight_used || currentExercise.weight,
      rest_time_seconds: actualRestTime
    });

    // Always start rest timer after completing a set, unless it's the last set of the last exercise
    const isLastSetOfWorkout = newSetsCompleted >= currentExercise.sets && currentExerciseIndex >= exercises.length - 1;

    if (!isLastSetOfWorkout) {
      startRestTimer(currentExercise.rest_seconds);
    }

    // If this was the last set of the exercise, show completion message
    if (newSetsCompleted >= currentExercise.sets) {
      toast.success(`${currentExercise.exercises?.name || 'Exercise'} completed!`);
    }
  };

  const saveExerciseLogMutation = useMutation({
    mutationFn: async (log: ExerciseLog) => {
      // Ensure exercise_name is never blank - try to get it from the workout_exercises join
      let exerciseName = log.exercise_name;
      if (!exerciseName || exerciseName.trim() === '') {
        console.warn('Exercise name was blank, fetching from database', {
          template_exercise_id: log.template_exercise_id,
          original_name: log.exercise_name
        });

        // Try to get the exercise name from the database
        const { data: templateExercise, error } = await supabase
          .from('template_exercises')
          .select('exercises(name)')
          .eq('id', log.template_exercise_id)
          .single();

        if (error) {
          console.error('Failed to fetch exercise name from database', error);
          exerciseName = 'Unknown Exercise';
        } else {
          exerciseName = templateExercise?.exercises?.[0]?.name || 'Unknown Exercise';
          console.log('Successfully fetched exercise name from database', exerciseName);
        }
      }

      // Get exercise_id from the current exercise data if not in log
      let exerciseId: string | undefined = log.exercise_id;
      if (!exerciseId && log.template_exercise_id) {
        // Find the exercise in the current session data
        const currentExercise = exercises.find(ex => ex.id === log.template_exercise_id);
        exerciseId = currentExercise?.exercises?.id;
        console.log('Resolved exercise_id:', exerciseId, 'from template_exercise_id:', log.template_exercise_id);
      }

      // Ensure weight is a number
      const weightUsed = log.weight_used !== undefined ? Number(log.weight_used) : null;

      const insertData = {
        session_id: sessionId,
        template_exercise_id: log.template_exercise_id,
        exercise_id: exerciseId,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        time_completed: log.time_completed,
        weight_used: weightUsed,
        rest_time_seconds: log.rest_time_seconds,
        notes: log.notes,
        // Planned values for historical accuracy - ensure NOT NULL fields have values
        planned_sets: log.planned_sets || 0,
        planned_reps: log.planned_reps || 0,
        planned_duration_seconds: log.planned_duration_seconds,
        planned_weight: log.planned_weight ? Number(log.planned_weight) : null,
        planned_rest_seconds: log.planned_rest_seconds || 0,
        exercise_name: exerciseName
      };


      console.log('Final insertData:', JSON.stringify(insertData, null, 2));

      const { error } = await supabase
        .from("exercise_logs")
        .insert(insertData);

      if (error) {
        console.error('Exercise log insert error:', error);
      }

      if (error) throw error;
    },
    onError: () => {
      toast.error("Failed to save exercise log");
    }
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error("No session ID");

      // Save all exercise logs
      const logsToSave = Object.values(exerciseLogs);
      for (const log of logsToSave) {
        await saveExerciseLogMutation.mutateAsync(log);
      }

      // Complete the session
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);

      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "completed",
          completed_at: endTime.toISOString(),
          duration_seconds: duration
        })
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workout completed! Great job! 🎉");
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["active-session-for-workout"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to complete workout");
    }
  });

  const handleCompleteWorkout = () => {
    setShowCompletionConfirm(true);
  };

  const confirmCompleteWorkout = () => {
    setShowCompletionConfirm(false);
    completeWorkoutMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const sign = seconds < 0 ? '+' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionQuery.data) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Workout</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <p>Loading workout session...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {sessionQuery.data.workouts.name}
          </DialogTitle>
          <DialogDescription>
            Track your workout progress • {completedExercises}/{totalExercises} exercises completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Rest Timer */}
          {restTimer && (
            <Card className={`border-2 border-orange-400/50 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 shadow-lg ${restTimer.running ? 'animate-pulse' : ''}`}>
              <CardContent className="pt-6 pb-6">
                <div className="text-center space-y-4">
                  <div className={`p-3 rounded-full ${restTimer.running ? 'bg-orange-500/20 animate-pulse' : 'bg-orange-500/10'} mx-auto w-fit`}>
                    <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      Rest Period
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Take your break • Recover for next set
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className={`text-4xl font-mono font-black mb-1 ${restTimer.timeLeft <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-900 dark:text-orange-100'}`}>
                        {formatTime(restTimer.timeLeft)}
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        of {formatTime(restTimer.totalTime)} planned
                        {restTimer.timeLeft <= 0 && (
                          <span className="text-red-600 dark:text-red-400 font-medium block">Overtime!</span>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <Button size="lg" onClick={resetRestTimer} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        End Rest
                      </Button>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                        Ready for next set?
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exercise Timer (for time-based exercises) */}
          {exerciseTimer && currentExercise?.exercises.is_time_based && (
            <Card className="border-blue-200/50 bg-blue-50/30 dark:border-blue-600/20 dark:bg-blue-900/10">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    <span className="font-medium">Exercise Timer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <span className="text-3xl font-mono font-black text-cyan-600 dark:text-cyan-400">
                        {formatTime(exerciseTimer.elapsed)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        target: {formatTime(currentExercise.duration_seconds || 30)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        if (exerciseTimer && currentExercise) {
                          const actualTime = Math.floor((Date.now() - exerciseTimer.startTime) / 1000);
                          updateExerciseLog(currentExercise.id, {
                            time_completed: actualTime
                          });
                          setExerciseTimer(null);
                          toast.success(`Recorded ${formatTime(actualTime)} for ${currentExercise.exercises.name}`);
                        }
                      }}>
                        Stop & Record
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Current Exercise */}
          {currentExercise ? (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Exercise {currentExerciseIndex + 1} of {totalExercises}
                  <Badge variant="secondary">
                    {currentExercise?.exercises?.name || 'Unknown Exercise'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Planned Exercise Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide">
                      Planned Workout
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 dark:bg-blue-950/10 rounded-lg border border-blue-200 dark:border-blue-800/20">
                    <div className="text-center">
                      <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">
                        {exerciseLogs[currentExercise.id]?.sets_completed || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Sets Completed</div>
                      <div className="text-xs text-muted-foreground">of {currentExercise.sets} planned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {currentExercise.exercises.is_time_based ? (currentExercise.duration_seconds || 30) : currentExercise.reps}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentExercise.exercises.is_time_based ? "Target Duration (sec)" : "Target Reps"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {currentExercise.weight || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Target Weight (lbs)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {currentExercise.rest_seconds}
                      </div>
                      <div className="text-sm text-muted-foreground">Rest Period (sec)</div>
                    </div>
                  </div>
                </div>

                {/* Actual Performance Tracking */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide">
                      Track Your Performance
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 dark:bg-green-950/10 rounded-lg border border-green-200 dark:border-green-800/20">
                    <div className="space-y-2">
                      <Label className="font-medium">
                        {currentExercise.exercises.is_time_based ? "Actual Time (sec)" : "Actual Reps"}
                      </Label>
                      {currentExercise.exercises.is_time_based ? (
                        // For time-based exercises, show the recorded time (read-only)
                        <div className="flex items-center justify-center h-10 px-3 border border-green-200 dark:border-green-700 rounded-md bg-muted/30">
                          <span className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {exerciseLogs[currentExercise.id]?.time_completed ?
                              `${exerciseLogs[currentExercise.id].time_completed}s` :
                              "Not recorded yet"
                            }
                          </span>
                        </div>
                      ) : (
                        // For rep-based exercises, allow manual entry
                        <Input
                          type="number"
                          className="border-green-200 dark:border-green-700 focus:border-green-400"
                          value={exerciseLogs[currentExercise.id]?.reps_completed || currentExercise.reps}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            updateExerciseLog(currentExercise.id, {
                              reps_completed: value
                            });
                          }}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Planned: {
                          currentExercise.exercises.is_time_based
                            ? `${currentExercise.duration_seconds || 30} sec`
                            : `${currentExercise.reps} reps`
                        }
                        {!currentExercise.exercises.is_time_based && (exerciseLogs[currentExercise.id]?.reps_completed || currentExercise.reps) !== currentExercise.reps && (
                          <span className="text-muted-foreground ml-1">• Modified</span>
                        )}
                      </p>
                    </div>
                    {currentExercise.exercises.is_time_based && (
                      <div className="col-span-full text-center">
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          💡 Time is automatically recorded when you complete the set above
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="font-medium">Actual Weight (lbs)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        className="border-green-200 dark:border-green-700 focus:border-green-400"
                        value={exerciseLogs[currentExercise.id]?.weight_used || currentExercise.weight || ""}
                        onChange={(e) => updateExerciseLog(currentExercise.id, {
                          weight_used: parseFloat(e.target.value) || undefined
                        })}
                        placeholder="Optional"
                      />
                      <p className="text-xs text-muted-foreground">
                        Planned: {currentExercise.weight || 0} lbs
                        {(exerciseLogs[currentExercise.id]?.weight_used || currentExercise.weight || 0) !== (currentExercise.weight || 0) && (
                          <span className="text-muted-foreground ml-1">• Modified</span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium">Performance Notes</Label>
                      <Input
                        className="border-green-200 dark:border-green-700 focus:border-green-400"
                        value={exerciseLogs[currentExercise.id]?.notes || ""}
                        onChange={(e) => updateExerciseLog(currentExercise.id, {
                          notes: e.target.value
                        })}
                        placeholder="How did it feel?"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={completeSet}
                    disabled={
                      Boolean(
                        (exerciseLogs[currentExercise.id]?.sets_completed || 0) >= currentExercise.sets ||
                        restTimer !== null ||
                        (currentExercise.exercises?.is_time_based && exerciseTimer)
                      )
                    }
                    className={`flex-1 ${restTimer ? 'opacity-50' : ''}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {currentExercise.exercises.is_time_based
                      ? ((exerciseTimer || exerciseLogs[currentExercise.id]?.time_completed) ? "Complete Set" : "Start Exercise")
                      : "Complete Set"
                    }
                  </Button>
                </div>

                {currentExercise.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Trainer Notes:</p>
                    <p className="text-sm text-muted-foreground">{currentExercise.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-red-200 bg-red-50/30 dark:border-red-800/20 dark:bg-red-950/10">
              <CardContent className="pt-6 text-center">
                <div className="text-red-600 dark:text-red-400 mb-2">
                  <AlertTriangle className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Exercises Found</h3>
                <p className="text-muted-foreground mb-4">
                  This workout template does not have any exercises configured yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact your trainer or try selecting a different workout.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
              disabled={currentExerciseIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              {exercises.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentExerciseIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentExerciseIndex
                      ? 'bg-primary'
                      : index < currentExerciseIndex
                      ? 'bg-green-400'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentExerciseIndex(prev => Math.min(exercises.length - 1, prev + 1))}
              disabled={currentExerciseIndex === exercises.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="flex pt-4 border-t">
          <Button
            onClick={handleCompleteWorkout}
            disabled={completeWorkoutMutation.isPending}
            className="w-full"
          >
            {completeWorkoutMutation.isPending ? "Saving..." : "Complete Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Completion Confirmation Dialog */}
    <Dialog open={showCompletionConfirm} onOpenChange={setShowCompletionConfirm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Complete Workout
          </DialogTitle>
          <DialogDescription>
            {(() => {
              const totalSetsCompleted = exercises.reduce((total, ex) => {
                return total + (exerciseLogs[ex.id]?.sets_completed || 0);
              }, 0);
              const totalSetsRequired = exercises.reduce((total, ex) => {
                return total + ex.sets;
              }, 0);

              return totalSetsCompleted >= totalSetsRequired ? (
                <span>
                  🎉 <strong>Excellent work!</strong> You&apos;ve completed all {totalSetsRequired} sets.
                  Ready to wrap up this workout session?
                </span>
              ) : (
                <span>
                  ⚠️ You&apos;ve completed <strong>{totalSetsCompleted}</strong> out of <strong>{totalSetsRequired}</strong> sets.
                  <br />
                  Make sure you&apos;ve clicked &quot;Complete Set&quot; for all exercises you performed before ending the workout.
                </span>
              );
            })()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setShowCompletionConfirm(false)}
            className="flex-1"
          >
            Keep Working
          </Button>
          <Button
            onClick={confirmCompleteWorkout}
            disabled={completeWorkoutMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {completeWorkoutMutation.isPending ? "Completing..." : "Complete Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
