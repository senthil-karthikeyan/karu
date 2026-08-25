import type { Project, ActivityItem, UserProfile } from "@/types/screenplay";

export const INITIAL_USER: UserProfile = {
  name: "Arjun Dev",
  email: "arjun.dev@karustudio.com",
  bio: "Screenwriter and independent filmmaker exploring psychological suspense and speculative fiction.",
  preferences: {
    editorTheme: "light",
    fontSize: 16,
    spellCheck: true,
    wordWrap: true,
    autoSave: true,
  },
};

export const INITIAL_SCREENPLAY_MIDNIGHT_TRAIN = `<h2 data-type="scene-heading">1. INT. TRAIN STATION - NIGHT</h2>
<p data-type="action">Steam hisses against cold iron girders. Rain lashes the arched glass ceiling of Central Terminus. The station clock ticks over to 00:00.</p>
<p data-type="action">MEERA (30s), trenchcoat collar turned up against the damp, clutches a weathered leather notebook. Her knuckles are white.</p>
<p data-type="character">MEERA</p>
<p data-type="parenthetical">(whispering)</p>
<p data-type="dialogue">Track nine. Exactly as the telegram said.</p>
<p data-type="action">A low, rhythmic rumble reverberates through the concrete platform. Headlights pierce through the fog. A vintage passenger train glides silently to a stop.</p>
<p data-type="transition">CUT TO:</p>

<h2 data-type="scene-heading">2. INT. TRAIN COMPARTMENT - NIGHT</h2>
<p data-type="action">The train rocks gently as rain hits the double-paned windows. Polished mahogany panels and velvet upholstery evoke an era long past.</p>
<p data-type="action">A YOUNG WOMAN, Meera, sits by the window, staring out into the rushing darkness.</p>
<p data-type="character">MEERA</p>
<p data-type="parenthetical">(softly)</p>
<p data-type="dialogue">Where are you taking me?</p>
<p data-type="action">Across from her, an OLD MAN smiles faintly. His eyes reflect the amber reading lamp above.</p>
<p data-type="character">OLD MAN</p>
<p data-type="dialogue">To a place you need to be.</p>
<p data-type="action">A long pause settles between them. The steady cadence of wheels against steel fills the silence.</p>
<p data-type="character">MEERA</p>
<p data-type="dialogue">Do I have a choice?</p>
<p data-type="character">OLD MAN</p>
<p data-type="dialogue">Not anymore.</p>
<p data-type="transition">FADE OUT.</p>

<h2 data-type="scene-heading">3. EXT. DINING CAR - NIGHT</h2>
<p data-type="action">The train car winds along a steep cliffside track. Lightning flickers on the horizon, briefly illuminating the jagged sea cliffs below.</p>
<p data-type="character">CONDUCTOR (O.S.)</p>
<p data-type="dialogue">Tickets, please. Destination confirmations.</p>
<p data-type="action">Meera turns. The doorway is empty, yet wet footprints lead toward the rear vestibule.</p>
`;

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "midnight-train",
    title: "Midnight Train",
    logline: "A detective travels through a series of mysterious events on a phantom train that appears only at midnight.",
    genre: "Thriller",
    format: "Feature Film",
    status: "In Progress",
    synopsis: "When an investigator boards a mysterious midnight train to search for her missing mentor, she discovers each compartment represents a forgotten fragment of her own past.",
    coverImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-17T22:30:00.000Z",
    lastEditedScene: "INT. TRAIN COMPARTMENT - NIGHT",
    stats: {
      pageCount: 112,
      wordCount: 2646,
      sceneCount: 24,
    },
    screenplayContent: INITIAL_SCREENPLAY_MIDNIGHT_TRAIN,
    scenes: [
      {
        id: "sc-1",
        number: 1,
        slugline: "INT. TRAIN STATION - NIGHT",
        location: "Train Station",
        time: "NIGHT",
        summary: "Meera arrives at platform 9 at midnight as the phantom train pulls in.",
        pageNumber: 1,
      },
      {
        id: "sc-2",
        number: 2,
        slugline: "INT. TRAIN COMPARTMENT - NIGHT",
        location: "Train Compartment",
        time: "NIGHT",
        summary: "Meera meets the mysterious Old Man in the passenger compartment.",
        pageNumber: 2,
      },
      {
        id: "sc-3",
        number: 3,
        slugline: "EXT. DINING CAR - NIGHT",
        location: "Dining Car",
        time: "NIGHT",
        summary: "The conductor calls for tickets as ghostly footprints appear in the corridor.",
        pageNumber: 3,
      },
      {
        id: "sc-4",
        number: 4,
        slugline: "INT. CORRIDOR - NIGHT",
        location: "Train Corridor",
        time: "NIGHT",
        summary: "Meera investigates the whispering doors.",
        pageNumber: 5,
      },
      {
        id: "sc-5",
        number: 5,
        slugline: "INT. LUXURY SUITE - NIGHT",
        location: "Luxury Suite",
        time: "NIGHT",
        summary: "A forgotten photograph is found inside a locked velvet suitcase.",
        pageNumber: 7,
      },
      {
        id: "sc-6",
        number: 6,
        slugline: "INT. ENGINE ROOM - NIGHT",
        location: "Engine Room",
        time: "NIGHT",
        summary: "The engine runs without coal or crew.",
        pageNumber: 10,
      },
      {
        id: "sc-7",
        number: 7,
        slugline: "EXT. TRAIN - DAWN",
        location: "Outside the Train",
        time: "DAWN",
        summary: "The train emerges from the mountain tunnel as the sun crests the sea.",
        pageNumber: 14,
      },
    ],
  },
  {
    id: "echoes-of-tomorrow",
    title: "Echoes of Tomorrow",
    logline: "An astrophysicist receives audio signals from 48 hours in the future that predict impending anomalies.",
    genre: "Sci-Fi",
    format: "Feature Film",
    status: "In Progress",
    synopsis: "Deep in an Andean observatory, Dr. Kaelen intercepts an acoustic radio anomaly carrying future weather patterns and his own frantic distress call.",
    coverImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-08-01T14:15:00.000Z",
    updatedAt: "2026-08-16T18:45:00.000Z",
    lastEditedScene: "INT. OBSERVATORY DOME - NIGHT",
    stats: {
      pageCount: 88,
      wordCount: 1950,
      sceneCount: 18,
    },
    screenplayContent: `<h2 data-type="scene-heading">1. INT. OBSERVATORY DOME - NIGHT</h2><p data-type="action">Starlight floods through the giant dome slit. DR. KAELEN (40s) adjusts the radio telescope spectrometer.</p><p data-type="character">KAELEN</p><p data-type="dialogue">Frequency locked. Timestamp discrepancy: negative 48 hours.</p>`,
    scenes: [
      {
        id: "e-1",
        number: 1,
        slugline: "INT. OBSERVATORY DOME - NIGHT",
        location: "Observatory Dome",
        time: "NIGHT",
        summary: "Signal detection anomaly.",
        pageNumber: 1,
      },
    ],
  },
  {
    id: "the-last-letter",
    title: "The Last Letter",
    logline: "A retired postal inspector sets out across post-war Europe to deliver an unopened letter sent sixty years ago.",
    genre: "Drama",
    format: "Short Film",
    status: "Completed",
    synopsis: "Finding a sealed envelope behind the vintage sorting shelves of a Parisian post office, Henri embarks on one final journey to fulfill a promise.",
    coverImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    createdAt: "2026-07-20T11:00:00.000Z",
    updatedAt: "2026-08-14T16:10:00.000Z",
    lastEditedScene: "EXT. SEINE RIVERBANK - DUSK",
    stats: {
      pageCount: 32,
      wordCount: 840,
      sceneCount: 9,
    },
    screenplayContent: `<h2 data-type="scene-heading">1. INT. OLD POST OFFICE - DAY</h2><p data-type="action">Dust motes dance in sunlight filtering through leaded glass. HENRI (70s) carefully slides a yellowed envelope from the floorboards.</p>`,
    scenes: [
      {
        id: "l-1",
        number: 1,
        slugline: "INT. OLD POST OFFICE - DAY",
        location: "Old Post Office",
        time: "DAY",
        summary: "Discovery of the lost letter.",
        pageNumber: 1,
      },
    ],
  },
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    projectId: "midnight-train",
    type: "edited",
    title: "Screenplay edited: Scene 2 - Train Compartment",
    description: "Refined Meera and Old Man dialogue and added transition notes.",
    timestamp: "2026-08-17T22:30:00.000Z",
    metadata: { sceneNumber: 2, wordCount: 2646 },
  },
  {
    id: "act-2",
    projectId: "midnight-train",
    type: "exported",
    title: "Screenplay exported to PDF",
    description: "Exported Draft 2 (112 pages) with industry standard margins.",
    timestamp: "2026-08-17T18:15:00.000Z",
    metadata: { format: "PDF" },
  },
  {
    id: "act-3",
    projectId: "midnight-train",
    type: "saved",
    title: "Screenplay auto-saved",
    description: "Synchronized latest revision with cloud workspace cache.",
    timestamp: "2026-08-17T17:40:00.000Z",
  },
  {
    id: "act-4",
    projectId: "midnight-train",
    type: "updated",
    title: "Project details updated",
    description: "Updated logline and genre classification to Thriller.",
    timestamp: "2026-08-16T12:00:00.000Z",
  },
  {
    id: "act-5",
    projectId: "midnight-train",
    type: "created",
    title: "Project created",
    description: "Project 'Midnight Train' initialized in Karu Studio.",
    timestamp: "2026-08-10T09:00:00.000Z",
  },
];
