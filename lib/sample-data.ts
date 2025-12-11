export const sampleTeamMembers = [
  {
    id: "tm-1",
    name: "Alex Rivera",
    role: "Strategy Partner",
    bio: "Drives growth and GTM excellence across fintech and SaaS.",
    expertise: ["GTM", "Pricing", "Fintech", "Board Prep"],
    photo: "https://placehold.co/400x400?text=Profile",
    slack: "slack://user?team=ABC&id=DEF",
    calendly: "https://calendly.com/placeholder",
    email: "alex.rivera@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-2",
    name: "Priya Desai",
    role: "Data & AI Lead",
    bio: "Builds data platforms and ML pilots that ship quickly.",
    expertise: ["AI/ML", "Analytics", "Data Strategy", "MLOps"],
    photo: "https://placehold.co/400x400?text=Profile",
    slack: "slack://user?team=ABC&id=DEG",
    calendly: "https://calendly.com/placeholder",
    email: "priya.desai@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-3",
    name: "Jordan Kim",
    role: "Engagement Manager",
    bio: "Runs cross-functional sprints and client storytelling.",
    expertise: ["PMO", "Storytelling", "Workshops", "Change"],
    photo: "https://placehold.co/400x400?text=Profile",
    slack: "slack://user?team=ABC&id=DEH",
    calendly: "https://calendly.com/placeholder",
    email: "jordan.kim@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
];

export const sampleKnowledgeAssets = [
  {
    id: "ka-1",
    title: "PE Pitch MegaDeck",
    description: "30-slide master narrative for private equity and diligence.",
    tags: ["Pitch", "PE", "Narrative"],
    last_updated: "2024-11-02",
    owner: "Alex Rivera",
    link: "https://docs.google.com/placeholder",
  },
  {
    id: "ka-2",
    title: "AI Discovery Template",
    description: "Workshop template to uncover AI automation wins in 90 minutes.",
    tags: ["AI", "Workshop", "Template"],
    last_updated: "2024-10-15",
    owner: "Priya Desai",
    link: "https://docs.google.com/placeholder",
  },
  {
    id: "ka-3",
    title: "Operating Model Blueprint",
    description: "Target org design and RACI for digital transformations.",
    tags: ["Ops", "Org Design", "RACI"],
    last_updated: "2024-09-28",
    owner: "Jordan Kim",
    link: "https://docs.google.com/placeholder",
  },
];

export const sampleProjects = [
  {
    id: "pr-1",
    client: "Helio Bank",
    name: "Digital KYC Reboot",
    partner: "David Chou",
    stage: "Active",
    next_milestone: "MVP pilot",
    next_date: "2024-12-20",
    team: [
      { name: "Kristin Kelly", avatar: "/team/Kristin Kelly.png" },
      { name: "Justin Longua", avatar: "/team/Justin Longua.png" },
    ],
    drive: "https://drive.google.com/placeholder",
  },
  {
    id: "pr-2",
    client: "Northwind Energy",
    name: "AI Ops Playbook",
    partner: "David Chou",
    stage: "Pitch",
    next_milestone: "Exec pitch",
    next_date: "2024-12-15",
    team: [
      { name: "Ally Reilly", avatar: "/team/Ally Reilly.png" },
      { name: "Maddy Kelly", avatar: "/team/Maddy Kelly.png" },
    ],
    drive: "https://drive.google.com/placeholder",
  },
  {
    id: "pr-3",
    client: "Zen Health",
    name: "Care Journey Redesign",
    partner: "David Chou",
    stage: "Lead",
    next_milestone: "Discovery",
    next_date: "2024-12-05",
    team: [
      { name: "Jackie Edison", avatar: "/team/Jackie Edison.png" },
      { name: "Christine Gilroy", avatar: "/team/Christine Gilroy.png" },
    ],
    drive: "https://drive.google.com/placeholder",
  },
];

export const sampleWins = [
  {
    id: "win-1",
    title: "Closed Helio Bank",
    content: "We landed the digital KYC rebuild with a rapid 6-week pilot.",
    author: "Alex Rivera",
    date: "2024-11-10",
    image: "",
    type: "internal" as const,
    linkedin_url: null,
  },
  {
    id: "win-2",
    title: "AI Lab Launched",
    content: "Stood up a reusable AI lab with governance in under a month.",
    author: "Priya Desai",
    date: "2024-10-22",
    image: "",
    type: "internal" as const,
    linkedin_url: null,
  },
];

export const sampleOOOEvents = [
  {
    id: "ooo-1",
    person: "David Chou",
    type: "OOO",
    location: "Lisbon",
    start_date: "2024-12-12",
    end_date: "2024-12-18",
    notes: "Partial availability in evenings.",
  },
  {
    id: "ooo-2",
    person: "David Chou",
    type: "Travel",
    location: "NYC - Client",
    start_date: "2024-12-04",
    end_date: "2024-12-06",
    notes: "On-site with Helio Bank.",
  },
];

export const sampleQuickLinks = [
  {
    id: "ql-1",
    label: "Healthcare Article Repo",
    description: "Modern healthcare tutorial archive",
    icon: "Folder",
    url: "https://modern-healthcare.vercel.app/tutorial",
  },
  {
    id: "ql-2",
    label: "Expenses",
    description: "Submit expenses (link pending)",
    icon: "Receipt",
    url: "https://example.com/expenses",
  },
  {
    id: "ql-3",
    label: "Clockify",
    description: "Time tracking dashboard",
    icon: "Clock",
    url: "https://app.clockify.me/tracker",
  },
];

export const sampleFeedback = [
  {
    id: "fb-1",
    message: "Team was responsive and pragmatic. Loved the concise updates.",
    client_name: null,
    client_email: null,
    created_at: "2024-11-01T10:00:00Z",
  },
];

export const sampleBookings = [
  {
    id: "bk-1",
    resource: "Room A",
    start: "2024-12-05T14:00:00Z",
    end: "2024-12-05T15:00:00Z",
    booked_by: "David Chou",
  },
  {
    id: "bk-2",
    resource: "Laptop 1",
    start: "2024-12-06T09:00:00Z",
    end: "2024-12-06T12:00:00Z",
    booked_by: "David Chou",
  },
];

export const samplePolls = [
  {
    id: "poll-1",
    question: "Best date for the offsite?",
    options: [
      { id: "opt-1", label: "Jan 10", votes: 5 },
      { id: "opt-2", label: "Jan 17", votes: 8 },
      { id: "opt-3", label: "Jan 24", votes: 3 },
    ],
  },
  {
    id: "poll-2",
    question: "Which client gift box?",
    options: [
      { id: "opt-4", label: "Local artisan foods", votes: 6 },
      { id: "opt-5", label: "Portable chargers", votes: 4 },
      { id: "opt-6", label: "Desk plants", votes: 7 },
    ],
  },
];

