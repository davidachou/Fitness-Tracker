"use client";

import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Save,
  X
} from "lucide-react";

type WorkoutSession = {
  id: string;
  workout_id: string;
  started_at: string;
  status: string;
  workouts: {
    name: string;
    workout_exercises: Array<{
      id: string;
      sets: number;
      reps: number;
      weight?: number;
      rest_seconds: number;
      notes?: string;
      exercises: {
        id: string;
        name: string;
        instructions?: string;
      };
    }>;
  };
};

type ExerciseLog = {
  workout_exercise_id: string;
  sets_completed: number;
  reps_completed: number;
  weight_used?: number;
  rest_time_seconds: number;
  notes?: string;
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
  const [restTimer, setRestTimer] = useState<{ running: boolean; timeLeft: number; totalTime: number } | null>(null);
  const [sessionStartTime] = useState(new Date());

  // Get session data
  const sessionQuery = useQuery({
    queryKey: ["workout-session", sessionId],
    enabled: Boolean(sessionId && open),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          workout_id,
          started_at,
          status,
          workouts!inner(
            name,
            workout_exercises(
              id,
              sets,
              reps,
              weight,
              rest_seconds,
              notes,
              exercises!inner(
                id,
                name,
                instructions
              )
            )
          )
        `)
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      return data as WorkoutSession;
    },
  });

  const exercises = sessionQuery.data?.workouts.workout_exercises || [];
  const currentExercise = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(ex =>
    exerciseLogs[ex.id]?.sets_completed >= ex.sets
  ).length;
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer?.running && restTimer.timeLeft > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => prev ? {
          ...prev,
          timeLeft: prev.timeLeft - 1
        } : null);
      }, 1000);
    } else if (restTimer?.timeLeft === 0) {
      // Timer finished
      setRestTimer(null);
      toast.success("Rest time complete!");
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const startRestTimer = (seconds: number) => {
    setRestTimer({
      running: true,
      timeLeft: seconds,
      totalTime: seconds
    });
  };

  const pauseRestTimer = () => {
    setRestTimer(prev => prev ? { ...prev, running: false } : null);
  };

  const resumeRestTimer = () => {
    setRestTimer(prev => prev ? { ...prev, running: true } : null);
  };

  const resetRestTimer = () => {
    setRestTimer(null);
  };

  const updateExerciseLog = (exerciseId: string, updates: Partial<ExerciseLog>) => {
    setExerciseLogs(prev => ({
      ...prev,
      [exerciseId]: {
        workout_exercise_id: exerciseId,
        sets_completed: 0,
        reps_completed: 0,
        rest_time_seconds: 0,
        ...prev[exerciseId],
        ...updates
      }
    }));
  };

  const completeSet = () => {
    if (!currentExercise) return;

    const currentLog = exerciseLogs[currentExercise.id] || {
      workout_exercise_id: currentExercise.id,
      sets_completed: 0,
      reps_completed: 0,
      rest_time_seconds: 0
    };

    const newSetsCompleted = currentLog.sets_completed + 1;

    updateExerciseLog(currentExercise.id, {
      sets_completed: newSetsCompleted,
      reps_completed: currentLog.reps_completed || currentExercise.reps,
      weight_used: currentLog.weight_used || currentExercise.weight,
      rest_time_seconds: currentExercise.rest_seconds
    });

    // Start rest timer if not the last set
    if (newSetsCompleted < currentExercise.sets) {
      startRestTimer(currentExercise.rest_seconds);
    } else {
      // Exercise completed, move to next
      toast.success(`${currentExercise.exercises.name} completed!`);
      if (currentExerciseIndex < exercises.length - 1) {
        setTimeout(() => {
          setCurrentExerciseIndex(prev => prev + 1);
        }, 1000);
      }
    }
  };

  const saveExerciseLogMutation = useMutation({
    mutationFn: async (log: ExerciseLog) => {
      const { error } = await supabase
        .from("exercise_logs")
        .insert({
          session_id: sessionId,
          workout_exercise_id: log.workout_exercise_id,
          sets_completed: log.sets_completed,
          reps_completed: log.reps_completed,
          weight_used: log.weight_used,
          rest_time_seconds: log.rest_time_seconds,
          notes: log.notes
        });

      if (error) throw error;
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error("Failed to complete workout");
    }
  });

  const handleCompleteWorkout = () => {
    completeWorkoutMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionQuery.data) {
    return null;
  }

  return (
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
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Rest Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono">
                      {formatTime(restTimer.timeLeft)}
                    </span>
                    <div className="flex gap-1">
                      {restTimer.running ? (
                        <Button size="sm" variant="outline" onClick={pauseRestTimer}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={resumeRestTimer}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={resetRestTimer}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Exercise */}
          {currentExercise && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Exercise {currentExerciseIndex + 1} of {totalExercises}
                  <Badge variant="secondary">
                    {currentExercise.exercises.name}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exercise Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {exerciseLogs[currentExercise.id]?.sets_completed || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Sets Completed</div>
                    <div className="text-xs">of {currentExercise.sets}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {exerciseLogs[currentExercise.id]?.reps_completed || currentExercise.reps}
                    </div>
                    <div className="text-sm text-muted-foreground">Reps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {exerciseLogs[currentExercise.id]?.weight_used || currentExercise.weight || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Weight (lbs)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {currentExercise.rest_seconds}
                    </div>
                    <div className="text-sm text-muted-foreground">Rest (sec)</div>
                  </div>
                </div>

                {/* Input Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Reps</Label>
                    <Input
                      type="number"
                      value={exerciseLogs[currentExercise.id]?.reps_completed || currentExercise.reps}
                      onChange={(e) => updateExerciseLog(currentExercise.id, {
                        reps_completed: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (lbs)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={exerciseLogs[currentExercise.id]?.weight_used || currentExercise.weight || ""}
                      onChange={(e) => updateExerciseLog(currentExercise.id, {
                        weight_used: parseFloat(e.target.value) || undefined
                      })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={exerciseLogs[currentExercise.id]?.notes || ""}
                      onChange={(e) => updateExerciseLog(currentExercise.id, {
                        notes: e.target.value
                      })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={completeSet}
                    disabled={(exerciseLogs[currentExercise.id]?.sets_completed || 0) >= currentExercise.sets}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Set
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
                      ? 'bg-green-500'
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

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Pause & Exit
          </Button>
          <Button
            onClick={handleCompleteWorkout}
            disabled={completeWorkoutMutation.isPending}
            className="flex-1"
          >
            {completeWorkoutMutation.isPending ? "Saving..." : "Complete Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
