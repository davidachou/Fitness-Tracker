"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical } from "lucide-react";

type FitnessClient = {
  id: string;
  name: string;
  email: string;
};

type Exercise = {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  difficulty: string;
};

type WorkoutExercise = {
  exercise_id: string;
  sets: number;
  reps: number;
  weight?: number;
  rest_seconds: number;
  notes?: string;
};

type WorkoutFormData = {
  client_id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
};

type WorkoutFormDialogProps = {
  open: boolean;
  onClose: () => void;
  workoutId?: string; // For editing existing workouts
  defaultClientId?: string; // For default client selection
};

const supabase = createClient();

export function WorkoutFormDialog({ open, onClose, workoutId, defaultClientId }: WorkoutFormDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<WorkoutFormData>({
    client_id: "",
    name: "",
    description: "",
    exercises: [],
  });

  // Get fitness clients
  const clientsQuery = useQuery({
    queryKey: ["fitness-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get profiles for name lookup
  const profilesQuery = useQuery({
    queryKey: ["profiles-lookup"],
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

  // Get all exercises
  const exercisesQuery = useQuery({
    queryKey: ["all-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, category, muscle_groups, difficulty")
        .order("name");
      if (error) throw error;
      return data as Exercise[];
    },
  });

  // Load workout data if editing
  useEffect(() => {
    if (workoutId && open) {
      loadWorkoutData();
    } else if (!workoutId && open) {
      // Reset form for new workout
      setFormData({
        client_id: defaultClientId || "",
        name: "",
        description: "",
        exercises: [],
      });
    }
  }, [workoutId, open, defaultClientId]);

  const loadWorkoutData = async () => {
    if (!workoutId) return;

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .select(`
        id,
        client_id,
        name,
        description,
        workout_exercises(
          exercise_id,
          sets,
          reps,
          weight,
          rest_seconds,
          notes
        )
      `)
      .eq("id", workoutId)
      .single();

    if (workoutError) {
      toast.error("Failed to load workout");
      return;
    }

    setFormData({
      client_id: workout.client_id,
      name: workout.name,
      description: workout.description || "",
      exercises: workout.workout_exercises.map((ex: any) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      })),
    });
  };

  const createWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          client_id: data.client_id,
          name: data.name,
          description: data.description || null,
        })
        .select("id")
        .single();

      if (workoutError) throw workoutError;

      // Add exercises
      if (data.exercises.length > 0) {
        const exerciseData = data.exercises.map((ex, index) => ({
          workout_id: workout.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || null,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          sort_order: index,
        }));

        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exerciseData);

        if (exercisesError) throw exercisesError;
      }

      return workout;
    },
    onSuccess: () => {
      toast.success("Workout created successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create workout");
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      if (!workoutId) throw new Error("No workout ID provided");

      // Update workout
      const { error: workoutError } = await supabase
        .from("workouts")
        .update({
          client_id: data.client_id,
          name: data.name,
          description: data.description || null,
        })
        .eq("id", workoutId);

      if (workoutError) throw workoutError;

      // Delete existing exercises and recreate them
      const { error: deleteError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId);

      if (deleteError) throw deleteError;

      // Add new exercises
      if (data.exercises.length > 0) {
        const exerciseData = data.exercises.map((ex, index) => ({
          workout_id: workoutId,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || null,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          sort_order: index,
        }));

        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exerciseData);

        if (exercisesError) throw exercisesError;
      }
    },
    onSuccess: () => {
      toast.success("Workout updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update workout");
    },
  });

  const addExercise = () => {
    setFormData(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: "",
          sets: 3,
          reps: 10,
          rest_seconds: 60,
        }
      ]
    }));
  };

  const removeExercise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const handleSubmit = () => {
    if (!formData.client_id || !formData.name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.exercises.some(ex => !ex.exercise_id)) {
      toast.error("Please select exercises for all workout items");
      return;
    }

    if (workoutId) {
      updateWorkoutMutation.mutate(formData);
    } else {
      createWorkoutMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workoutId ? "Edit Workout" : "Create New Workout"}
          </DialogTitle>
          <DialogDescription>
            {workoutId ? "Update workout details and exercises" : "Create a new workout plan for a client"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsQuery.data?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {profilesQuery.data?.[client.email] || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Workout Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Upper Body Strength"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional workout description or notes"
              rows={3}
            />
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Exercises</h3>
              <Button onClick={addExercise} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            {formData.exercises.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <p>No exercises added yet.</p>
                    <p className="text-sm mt-1">Click "Add Exercise" to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.exercises.map((exercise, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">Exercise {index + 1}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Exercise</Label>
                        <Select
                          value={exercise.exercise_id}
                          onValueChange={(value) => updateExercise(index, "exercise_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exercise" />
                          </SelectTrigger>
                          <SelectContent>
                            {exercisesQuery.data?.map(ex => (
                              <SelectItem key={ex.id} value={ex.id}>
                                <div className="flex items-center gap-2">
                                  <span>{ex.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {ex.category}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Sets</Label>
                          <Input
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reps</Label>
                          <Input
                            type="number"
                            min="1"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight (lbs)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={exercise.weight || ""}
                            onChange={(e) => updateExercise(index, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rest (sec)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={exercise.rest_seconds}
                            onChange={(e) => updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={exercise.notes || ""}
                          onChange={(e) => updateExercise(index, "notes", e.target.value)}
                          placeholder="Optional notes for this exercise"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createWorkoutMutation.isPending ||
              updateWorkoutMutation.isPending ||
              !formData.client_id ||
              !formData.name.trim()
            }
          >
            {createWorkoutMutation.isPending || updateWorkoutMutation.isPending
              ? "Saving..."
              : workoutId ? "Update Workout" : "Create Workout"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
