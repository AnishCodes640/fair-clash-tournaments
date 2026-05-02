// 60 quiz questions, mixed difficulty. The client picks 10 random questions
// (4 easy + 4 medium + 2 hard) per session and sends them to the server,
// which stores the correct answers privately and returns only the question id list.
// Correct answers are *also* sent to the server here on session start, but
// the client never re-uses them after that — it submits each answer to the
// server and gets back only a boolean.

export interface QuizQuestion {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  correct: string;
}

export const QUIZ_BANK: QuizQuestion[] = [
  // easy
  { id: "e1", difficulty: "easy", question: "Capital of France?", options: ["Paris", "London", "Berlin", "Madrid"], correct: "Paris" },
  { id: "e2", difficulty: "easy", question: "How many continents are there?", options: ["5", "6", "7", "8"], correct: "7" },
  { id: "e3", difficulty: "easy", question: "Largest planet in our solar system?", options: ["Earth", "Saturn", "Jupiter", "Neptune"], correct: "Jupiter" },
  { id: "e4", difficulty: "easy", question: "Which animal is known as 'King of the Jungle'?", options: ["Tiger", "Lion", "Elephant", "Bear"], correct: "Lion" },
  { id: "e5", difficulty: "easy", question: "What color do you get by mixing red and white?", options: ["Pink", "Purple", "Orange", "Brown"], correct: "Pink" },
  { id: "e6", difficulty: "easy", question: "How many days are in a leap year?", options: ["365", "366", "364", "367"], correct: "366" },
  { id: "e7", difficulty: "easy", question: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: "Pacific" },
  { id: "e8", difficulty: "easy", question: "Which gas do plants absorb?", options: ["Oxygen", "Hydrogen", "Carbon Dioxide", "Nitrogen"], correct: "Carbon Dioxide" },
  { id: "e9", difficulty: "easy", question: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: "6" },
  { id: "e10", difficulty: "easy", question: "What is H2O commonly known as?", options: ["Salt", "Sugar", "Water", "Acid"], correct: "Water" },
  { id: "e11", difficulty: "easy", question: "Which is the national sport of India?", options: ["Cricket", "Hockey", "Kabaddi", "Football"], correct: "Hockey" },
  { id: "e12", difficulty: "easy", question: "Which is the smallest prime number?", options: ["1", "2", "3", "0"], correct: "2" },
  { id: "e13", difficulty: "easy", question: "Largest desert in the world?", options: ["Sahara", "Gobi", "Antarctic", "Kalahari"], correct: "Antarctic" },
  { id: "e14", difficulty: "easy", question: "How many players in a cricket team?", options: ["10", "11", "12", "9"], correct: "11" },
  { id: "e15", difficulty: "easy", question: "Currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], correct: "Yen" },

  // medium
  { id: "m1", difficulty: "medium", question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Monet"], correct: "Da Vinci" },
  { id: "m2", difficulty: "medium", question: "Speed of light (approx, m/s)?", options: ["3x10^6", "3x10^7", "3x10^8", "3x10^9"], correct: "3x10^8" },
  { id: "m3", difficulty: "medium", question: "Which element has chemical symbol 'Au'?", options: ["Silver", "Aluminium", "Gold", "Argon"], correct: "Gold" },
  { id: "m4", difficulty: "medium", question: "Year India gained independence?", options: ["1945", "1947", "1950", "1942"], correct: "1947" },
  { id: "m5", difficulty: "medium", question: "Who wrote 'Romeo and Juliet'?", options: ["Dickens", "Shakespeare", "Tolstoy", "Hemingway"], correct: "Shakespeare" },
  { id: "m6", difficulty: "medium", question: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: "Mercury" },
  { id: "m7", difficulty: "medium", question: "How many bones in adult human body?", options: ["196", "206", "216", "226"], correct: "206" },
  { id: "m8", difficulty: "medium", question: "Which is the longest river?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: "Nile" },
  { id: "m9", difficulty: "medium", question: "Currency of United Kingdom?", options: ["Euro", "Pound", "Dollar", "Franc"], correct: "Pound" },
  { id: "m10", difficulty: "medium", question: "Who invented the telephone?", options: ["Edison", "Bell", "Tesla", "Marconi"], correct: "Bell" },
  { id: "m11", difficulty: "medium", question: "Square root of 144?", options: ["10", "11", "12", "14"], correct: "12" },
  { id: "m12", difficulty: "medium", question: "Tallest mountain in the world?", options: ["K2", "Everest", "Kanchenjunga", "Makalu"], correct: "Everest" },
  { id: "m13", difficulty: "medium", question: "Which year did WW2 end?", options: ["1944", "1945", "1946", "1947"], correct: "1945" },
  { id: "m14", difficulty: "medium", question: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Argon", "CO2"], correct: "Nitrogen" },
  { id: "m15", difficulty: "medium", question: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], correct: "6" },
  { id: "m16", difficulty: "medium", question: "Who is known as the father of computers?", options: ["Newton", "Babbage", "Einstein", "Turing"], correct: "Babbage" },
  { id: "m17", difficulty: "medium", question: "Which is the hottest planet?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correct: "Venus" },
  { id: "m18", difficulty: "medium", question: "Capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: "Canberra" },
  { id: "m19", difficulty: "medium", question: "Which language has most native speakers?", options: ["English", "Hindi", "Spanish", "Mandarin"], correct: "Mandarin" },
  { id: "m20", difficulty: "medium", question: "How many minutes in a full day?", options: ["1240", "1340", "1440", "1540"], correct: "1440" },

  // hard
  { id: "h1", difficulty: "hard", question: "Who developed General Relativity?", options: ["Newton", "Einstein", "Tesla", "Hawking"], correct: "Einstein" },
  { id: "h2", difficulty: "hard", question: "Smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Tuvalu"], correct: "Vatican City" },
  { id: "h3", difficulty: "hard", question: "Year the Berlin Wall fell?", options: ["1987", "1988", "1989", "1990"], correct: "1989" },
  { id: "h4", difficulty: "hard", question: "Which mathematician proved Fermat's Last Theorem?", options: ["Wiles", "Hardy", "Erdos", "Gauss"], correct: "Wiles" },
  { id: "h5", difficulty: "hard", question: "Chemical symbol of Tungsten?", options: ["T", "Tu", "W", "Tn"], correct: "W" },
  { id: "h6", difficulty: "hard", question: "Who wrote '1984'?", options: ["Huxley", "Orwell", "Bradbury", "Asimov"], correct: "Orwell" },
  { id: "h7", difficulty: "hard", question: "What is the rarest blood type?", options: ["O-", "AB-", "B-", "A-"], correct: "AB-" },
  { id: "h8", difficulty: "hard", question: "Largest moon of Saturn?", options: ["Titan", "Rhea", "Iapetus", "Dione"], correct: "Titan" },
  { id: "h9", difficulty: "hard", question: "Which year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correct: "2007" },
  { id: "h10", difficulty: "hard", question: "Which sea is the saltiest?", options: ["Red Sea", "Dead Sea", "Black Sea", "Mediterranean"], correct: "Dead Sea" },
  { id: "h11", difficulty: "hard", question: "Who painted 'Starry Night'?", options: ["Van Gogh", "Monet", "Cezanne", "Renoir"], correct: "Van Gogh" },
  { id: "h12", difficulty: "hard", question: "Atomic number of Carbon?", options: ["4", "5", "6", "7"], correct: "6" },
  { id: "h13", difficulty: "hard", question: "Who founded Microsoft?", options: ["Jobs", "Gates", "Musk", "Bezos"], correct: "Gates" },
  { id: "h14", difficulty: "hard", question: "Which Indian state has the longest coastline?", options: ["Kerala", "Tamil Nadu", "Gujarat", "Andhra Pradesh"], correct: "Gujarat" },
  { id: "h15", difficulty: "hard", question: "Which scientist proposed three laws of motion?", options: ["Einstein", "Newton", "Galileo", "Kepler"], correct: "Newton" },
];

export function pickQuizQuestions(): QuizQuestion[] {
  const easy = QUIZ_BANK.filter((q) => q.difficulty === "easy");
  const medium = QUIZ_BANK.filter((q) => q.difficulty === "medium");
  const hard = QUIZ_BANK.filter((q) => q.difficulty === "hard");
  const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  return [...shuffle(easy).slice(0, 4), ...shuffle(medium).slice(0, 4), ...shuffle(hard).slice(0, 2)];
}
