"use client";

import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { sampleProjects } from "@/lib/sample-data";
import { CalendarDays, ExternalLink, GripVertical, KanbanSquare } from "lucide-react";
import Link from "next/link";

type Project = (typeof sampleProjects)[number];
type SupabaseProject = {
  id: string;
  client: string;
  name: string;
  partner: string;
  stage: Project["stage"];
  next_milestone: string;
  next_date: string;
  team: { name: string; avatar?: string }[];
  drive: string;
};

const stages = ["Lead", "Pitch", "Active", "Closed-Won", "Closed-Lost"] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(sampleProjects);

  useEffect(() => {
    const supabase = createClient();
    const fetchProjects = async () => {
      const { data } = await supabase.from("projects").select("*");
      if (data && data.length > 0) {
        setProjects(
          (data as SupabaseProject[]).map((p) => ({
            ...p,
            team: (p.team || []).map((member, memberIdx) => ({
              name: member.name || `Teammate ${memberIdx + 1}`,
              avatar:
                member.avatar ||
                `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?sig=${memberIdx + 11}`,
            })),
          })),
        );
      }
    };
    fetchProjects();
  }, []);

  const grouped = useMemo(() => {
    return stages.reduce(
      (acc, stage) => ({
        ...acc,
        [stage]: projects.filter((p) => p.stage === stage),
      }),
      {} as Record<(typeof stages)[number], Project[]>,
    );
  }, [projects]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceStage = result.source.droppableId as Project["stage"];
    const destStage = result.destination.droppableId as Project["stage"];
    const updated = Array.from(grouped[sourceStage]);
    const [moved] = updated.splice(result.source.index, 1);
    const destList = Array.from(grouped[destStage]);
    destList.splice(result.destination.index, 0, { ...moved, stage: destStage });

    const nextProjects = projects.map((p) =>
      p.id === moved.id ? { ...p, stage: destStage } : p,
    );
    setProjects(nextProjects);
    // Optional: persist to Supabase here
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Pipeline</p>
        <h2 className="text-3xl font-black">Active Project Dashboard</h2>
        <p className="text-muted-foreground">
          Drag to reorder. Switch to table view for summaries. Data pulls from Supabase (placeholders preloaded).
        </p>
      </header>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="border-none bg-transparent p-0 shadow-none">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {stages.map((stage) => (
                <Droppable droppableId={stage} key={stage}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{stage}</span>
                        <Badge variant="secondary" className="bg-white/10">
                          {grouped[stage]?.length || 0}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {grouped[stage]?.map((project, idx) => (
                          <Draggable key={project.id} draggableId={project.id} index={idx}>
                            {(dragProvided) => (
                              <motion.div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                layout
                                className="rounded-xl border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur"
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="flex items-start gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <p className="font-semibold leading-tight">
                                        {project.client}
                                      </p>
                                      <Badge variant="outline" className="border-emerald-300/40 text-emerald-200">
                                        {project.partner}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{project.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <CalendarDays className="h-4 w-4" />
                                      <span>
                                        {project.next_milestone} —{" "}
                                        {new Date(project.next_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex -space-x-2 pt-1">
                                      {project.team.map((member) => (
                                        <Avatar key={member.name} className="h-8 w-8 border-2 border-white/50">
                                          <AvatarImage src={member.avatar} />
                                          <AvatarFallback>
                                            {member.name
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start gap-2 text-xs"
                                    >
                                      <Link href={project.drive} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-4 w-4" /> Drive folder
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="table" className="border border-white/10 bg-white/5 p-0 backdrop-blur">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Next milestone</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-semibold">{project.client}</TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.partner}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-white/10">
                      {project.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {project.next_milestone} — {new Date(project.next_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {project.team.map((member) => (
                        <Avatar key={member.name} className="h-8 w-8 border-2 border-white/50">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

