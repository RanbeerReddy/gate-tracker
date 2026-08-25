import { getDatabase } from './connection';
import { log } from '../utils/logger';

// GATE CSE Subjects with topics and subtopics
const GATE_CSE_SUBJECTS = [
  {
    name: 'General Aptitude',
    color: '#8B5CF6',
    topics: [
      { name: 'Verbal Ability', subtopics: ['Grammar', 'Sentence Completion', 'Reading Comprehension', 'Word Groups', 'Verbal Analogies'] },
      { name: 'Quantitative Aptitude', subtopics: ['Data Interpretation', 'Numerical Computation', 'Estimation'] },
      { name: 'Analytical Aptitude', subtopics: ['Logic', 'Deduction', 'Analogy'] },
      { name: 'Spatial Aptitude', subtopics: ['Transformation', 'Assembly', 'Paper Folding'] },
    ],
  },
  {
    name: 'Engineering Mathematics',
    color: '#EC4899',
    topics: [
      { name: 'Linear Algebra', subtopics: ['Matrices', 'Determinants', 'Eigenvalues & Eigenvectors', 'System of Linear Equations', 'Vector Spaces'] },
      { name: 'Calculus', subtopics: ['Limits & Continuity', 'Differentiation', 'Integration', 'Maxima & Minima', 'Multiple Integrals'] },
      { name: 'Probability & Statistics', subtopics: ['Random Variables', 'Distributions', 'Mean & Variance', 'Conditional Probability', 'Bayes Theorem'] },
      { name: 'Differential Equations', subtopics: ['First Order', 'Higher Order', 'Partial Differential Equations'] },
      { name: 'Complex Variables', subtopics: ['Analytic Functions', 'Cauchy Integral', 'Residues'] },
      { name: 'Numerical Methods', subtopics: ['Root Finding', 'Interpolation', 'Numerical Integration', 'Numerical Differentiation'] },
      { name: 'Transform Theory', subtopics: ['Laplace Transform', 'Z-Transform', 'Fourier Transform'] },
    ],
  },
  {
    name: 'C Programming',
    color: '#3B82F6',
    topics: [
      { name: 'Variables & Data Types', subtopics: ['Primitive Types', 'Type Casting', 'Constants', 'Storage Classes'] },
      { name: 'Operators', subtopics: ['Arithmetic', 'Relational', 'Logical', 'Bitwise', 'Precedence'] },
      { name: 'Control Flow', subtopics: ['If-Else', 'Switch', 'Loops', 'Break & Continue', 'Goto'] },
      { name: 'Functions', subtopics: ['Declaration & Definition', 'Parameter Passing', 'Recursion', 'Scope & Lifetime'] },
      { name: 'Arrays', subtopics: ['1D Arrays', '2D Arrays', 'Multidimensional', 'Array & Pointers'] },
      { name: 'Strings', subtopics: ['String Operations', 'String Library', 'Character Arrays'] },
      { name: 'Pointers', subtopics: ['Pointer Arithmetic', 'Pointers & Arrays', 'Function Pointers', 'Pointers & Structures', 'Double Pointers', 'Void Pointers'] },
      { name: 'Structures & Unions', subtopics: ['Structure Basics', 'Nested Structures', 'Unions', 'Bit Fields', 'Typedef'] },
      { name: 'Dynamic Memory', subtopics: ['malloc', 'calloc', 'realloc', 'free', 'Memory Leaks'] },
      { name: 'File Handling', subtopics: ['File Operations', 'Text Files', 'Binary Files'] },
      { name: 'Preprocessor', subtopics: ['Macros', 'Conditional Compilation', 'Include Guards'] },
    ],
  },
  {
    name: 'Data Structures',
    color: '#10B981',
    topics: [
      { name: 'Arrays & Linked Lists', subtopics: ['Array Operations', 'Singly Linked List', 'Doubly Linked List', 'Circular Linked List'] },
      { name: 'Stacks', subtopics: ['Array Implementation', 'Linked List Implementation', 'Applications', 'Expression Evaluation'] },
      { name: 'Queues', subtopics: ['Simple Queue', 'Circular Queue', 'Priority Queue', 'Deque'] },
      { name: 'Trees', subtopics: ['Binary Trees', 'Binary Search Trees', 'AVL Trees', 'B-Trees', 'B+ Trees', 'Tree Traversals'] },
      { name: 'Heaps', subtopics: ['Min Heap', 'Max Heap', 'Heap Operations', 'Heap Sort', 'Priority Queue'] },
      { name: 'Graphs', subtopics: ['Representations', 'BFS', 'DFS', 'Shortest Paths', 'MST', 'Topological Sort'] },
      { name: 'Hashing', subtopics: ['Hash Functions', 'Collision Resolution', 'Open Addressing', 'Chaining'] },
      { name: 'Tries', subtopics: ['Standard Trie', 'Compressed Trie', 'Applications'] },
    ],
  },
  {
    name: 'Algorithms',
    color: '#F59E0B',
    topics: [
      { name: 'Asymptotic Analysis', subtopics: ['Big-O', 'Big-Omega', 'Big-Theta', 'Recurrence Relations', 'Master Theorem'] },
      { name: 'Searching', subtopics: ['Linear Search', 'Binary Search', 'Ternary Search'] },
      { name: 'Sorting', subtopics: ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort', 'Heap Sort', 'Radix Sort', 'Counting Sort'] },
      { name: 'Divide & Conquer', subtopics: ['Merge Sort', 'Quick Sort', 'Strassen\'s', 'Closest Pair'] },
      { name: 'Greedy Algorithms', subtopics: ['Activity Selection', 'Huffman Coding', 'Fractional Knapsack', 'Job Sequencing'] },
      { name: 'Dynamic Programming', subtopics: ['0/1 Knapsack', 'LCS', 'LIS', 'Matrix Chain', 'Floyd-Warshall', 'Bellman-Ford'] },
      { name: 'Graph Algorithms', subtopics: ['Dijkstra', 'Prim\'s', 'Kruskal\'s', 'Floyd-Warshall', 'Bellman-Ford', 'Network Flow'] },
      { name: 'Backtracking', subtopics: ['N-Queens', 'Subset Sum', 'Graph Coloring', 'Hamiltonian Cycle'] },
      { name: 'NP-Completeness', subtopics: ['P vs NP', 'NP-Complete Problems', 'Reductions', 'Approximation Algorithms'] },
    ],
  },
  {
    name: 'Discrete Mathematics',
    color: '#06B6D4',
    topics: [
      { name: 'Propositional Logic', subtopics: ['Propositions', 'Connectives', 'Truth Tables', 'Logical Equivalence', 'Normal Forms'] },
      { name: 'First Order Logic', subtopics: ['Predicates', 'Quantifiers', 'Inference Rules', 'Validity'] },
      { name: 'Sets & Relations', subtopics: ['Set Operations', 'Relations Properties', 'Equivalence Relations', 'Partial Orders', 'Closures'] },
      { name: 'Functions', subtopics: ['Types of Functions', 'Composition', 'Inverse', 'Pigeonhole Principle'] },
      { name: 'Combinatorics', subtopics: ['Permutations', 'Combinations', 'Inclusion-Exclusion', 'Generating Functions', 'Recurrence Relations'] },
      { name: 'Graph Theory', subtopics: ['Graph Properties', 'Isomorphism', 'Planarity', 'Euler & Hamilton', 'Coloring'] },
      { name: 'Group Theory', subtopics: ['Groups', 'Subgroups', 'Cyclic Groups', 'Cosets', 'Lagrange\'s Theorem'] },
      { name: 'Lattices & Boolean Algebra', subtopics: ['Posets', 'Lattices', 'Boolean Algebra', 'Boolean Functions'] },
    ],
  },
  {
    name: 'Digital Logic',
    color: '#EF4444',
    topics: [
      { name: 'Boolean Algebra', subtopics: ['Boolean Functions', 'Canonical Forms', 'Simplification'] },
      { name: 'Logic Gates', subtopics: ['Basic Gates', 'Universal Gates', 'Gate-Level Design'] },
      { name: 'Minimization', subtopics: ['K-Maps', 'Quine-McCluskey', 'Don\'t Care Conditions'] },
      { name: 'Combinational Circuits', subtopics: ['Adders', 'Subtractors', 'Multiplexers', 'Decoders', 'Encoders', 'Comparators'] },
      { name: 'Sequential Circuits', subtopics: ['Flip-Flops', 'Latches', 'Counters', 'Shift Registers', 'Finite State Machines'] },
      { name: 'Number Systems', subtopics: ['Binary', 'Octal', 'Hexadecimal', 'BCD', 'Complements', 'Floating Point'] },
    ],
  },
  {
    name: 'Computer Organization & Architecture',
    color: '#F97316',
    topics: [
      { name: 'Machine Instructions', subtopics: ['Instruction Formats', 'Addressing Modes', 'Instruction Types'] },
      { name: 'ALU & Data Path', subtopics: ['ALU Design', 'Data Path Design', 'Control Unit'] },
      { name: 'Pipelining', subtopics: ['Pipeline Stages', 'Hazards', 'Stalling', 'Forwarding', 'Branch Prediction'] },
      { name: 'Memory Hierarchy', subtopics: ['Cache Memory', 'Cache Mapping', 'Cache Replacement', 'Virtual Memory', 'TLB'] },
      { name: 'I/O Organization', subtopics: ['I/O Interfaces', 'Interrupts', 'DMA', 'I/O Processors'] },
      { name: 'CPU Performance', subtopics: ['CPI', 'MIPS', 'Amdahl\'s Law', 'Speedup'] },
    ],
  },
  {
    name: 'Operating Systems',
    color: '#84CC16',
    topics: [
      { name: 'Processes & Threads', subtopics: ['Process Concepts', 'Process States', 'PCB', 'Threads', 'Multithreading'] },
      { name: 'CPU Scheduling', subtopics: ['FCFS', 'SJF', 'Priority', 'Round Robin', 'MLFQ'] },
      { name: 'Process Synchronization', subtopics: ['Critical Section', 'Mutex', 'Semaphores', 'Monitors', 'Classical Problems'] },
      { name: 'Deadlocks', subtopics: ['Conditions', 'Prevention', 'Avoidance', 'Detection', 'Recovery', 'Banker\'s Algorithm'] },
      { name: 'Memory Management', subtopics: ['Paging', 'Segmentation', 'Page Replacement', 'Frame Allocation', 'Thrashing'] },
      { name: 'Virtual Memory', subtopics: ['Demand Paging', 'Page Fault', 'Page Replacement Algorithms', 'Working Set'] },
      { name: 'File Systems', subtopics: ['File Organization', 'Directory Structure', 'Allocation Methods', 'Free Space Management'] },
      { name: 'Disk Scheduling', subtopics: ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK'] },
    ],
  },
  {
    name: 'Computer Networks',
    color: '#14B8A6',
    topics: [
      { name: 'Network Models', subtopics: ['OSI Model', 'TCP/IP Model', 'Comparison'] },
      { name: 'Physical Layer', subtopics: ['Transmission Media', 'Multiplexing', 'Switching'] },
      { name: 'Data Link Layer', subtopics: ['Framing', 'Error Detection', 'Error Correction', 'Flow Control', 'MAC Protocols'] },
      { name: 'Network Layer', subtopics: ['IP Addressing', 'Subnetting', 'CIDR', 'Routing Algorithms', 'IPv4', 'IPv6', 'NAT'] },
      { name: 'Transport Layer', subtopics: ['TCP', 'UDP', 'Flow Control', 'Congestion Control', 'Connection Management'] },
      { name: 'Application Layer', subtopics: ['DNS', 'HTTP', 'FTP', 'SMTP', 'DHCP', 'Sockets'] },
      { name: 'Network Security', subtopics: ['Encryption', 'Digital Signatures', 'Firewalls', 'SSL/TLS'] },
    ],
  },
  {
    name: 'DBMS',
    color: '#A855F7',
    topics: [
      { name: 'ER Model', subtopics: ['Entities', 'Attributes', 'Relationships', 'ER Diagrams', 'Extended ER'] },
      { name: 'Relational Model', subtopics: ['Relations', 'Keys', 'Relational Algebra', 'Relational Calculus'] },
      { name: 'SQL', subtopics: ['DDL', 'DML', 'Joins', 'Subqueries', 'Aggregate Functions', 'Views', 'Triggers'] },
      { name: 'Normalization', subtopics: ['Functional Dependencies', '1NF', '2NF', '3NF', 'BCNF', '4NF', 'Decomposition'] },
      { name: 'Transactions', subtopics: ['ACID Properties', 'Serializability', 'Conflict Serializability', 'View Serializability'] },
      { name: 'Concurrency Control', subtopics: ['Lock-Based', 'Timestamp-Based', 'Two-Phase Locking', 'Deadlock Handling'] },
      { name: 'Recovery', subtopics: ['Log-Based Recovery', 'Checkpoints', 'Shadow Paging', 'ARIES'] },
      { name: 'Indexing', subtopics: ['B-Tree', 'B+ Tree', 'Hashing', 'Bitmap Index', 'Clustered Index'] },
    ],
  },
  {
    name: 'Theory of Computation',
    color: '#E11D48',
    topics: [
      { name: 'Finite Automata', subtopics: ['DFA', 'NFA', 'NFA to DFA', 'DFA Minimization', 'Epsilon-NFA'] },
      { name: 'Regular Languages', subtopics: ['Regular Expressions', 'Pumping Lemma', 'Closure Properties', 'Decision Problems'] },
      { name: 'Context-Free Grammars', subtopics: ['CFG', 'Derivations', 'Parse Trees', 'Ambiguity', 'Simplification', 'Normal Forms'] },
      { name: 'Pushdown Automata', subtopics: ['PDA', 'PDA & CFG Equivalence', 'Deterministic PDA'] },
      { name: 'Turing Machines', subtopics: ['TM Design', 'Variants', 'Church-Turing Thesis', 'Universal TM'] },
      { name: 'Undecidability', subtopics: ['Halting Problem', 'Rice\'s Theorem', 'Reducibility', 'Post Correspondence'] },
      { name: 'Complexity Classes', subtopics: ['P', 'NP', 'NP-Complete', 'NP-Hard', 'Co-NP'] },
    ],
  },
  {
    name: 'Compiler Design',
    color: '#D946EF',
    topics: [
      { name: 'Lexical Analysis', subtopics: ['Tokens', 'Regular Expressions', 'Finite Automata', 'Lex'] },
      { name: 'Syntax Analysis', subtopics: ['Context-Free Grammars', 'Parse Trees', 'Ambiguity Resolution'] },
      { name: 'Parsing', subtopics: ['Top-Down Parsing', 'LL(1)', 'Bottom-Up Parsing', 'LR(0)', 'SLR', 'CLR', 'LALR'] },
      { name: 'Syntax-Directed Translation', subtopics: ['Attributes', 'S-Attributed', 'L-Attributed', 'SDT Schemes'] },
      { name: 'Intermediate Code', subtopics: ['Three-Address Code', 'DAG', 'Postfix Notation', 'Quadruples', 'Triples'] },
      { name: 'Code Optimization', subtopics: ['Local Optimization', 'Global Optimization', 'Loop Optimization', 'Dead Code Elimination'] },
      { name: 'Code Generation', subtopics: ['Register Allocation', 'Instruction Selection', 'Peephole Optimization'] },
      { name: 'Runtime Environments', subtopics: ['Activation Records', 'Stack Allocation', 'Heap Management', 'Garbage Collection'] },
    ],
  },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'dark',
  date_format: 'yyyy-MM-dd',
  time_format: 'HH:mm',
  daily_study_target_hours: '7',
  revision_intervals: '1,3,7,14,30',
  first_run_complete: 'false',
  target_gate_year: '',
  target_score: '',
  target_rank: '',
};

export function seedData(): void {
  const db = getDatabase();
  
  // Check if subjects already exist
  const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get() as any;
  if (subjectCount.count > 0) {
    log('Seed data already exists, skipping.');
    
    // Ensure default settings exist
    seedSettings();
    return;
  }
  
  log('Seeding initial data...');
  
  const insertSubject = db.prepare(
    'INSERT INTO subjects (name, color, display_order) VALUES (?, ?, ?)'
  );
  const insertTopic = db.prepare(
    'INSERT INTO topics (subject_id, name, display_order) VALUES (?, ?, ?)'
  );
  const insertSubtopic = db.prepare(
    'INSERT INTO subtopics (topic_id, name, display_order) VALUES (?, ?, ?)'
  );
  
  const seedAll = db.transaction(() => {
    GATE_CSE_SUBJECTS.forEach((subject, sIdx) => {
      const subjectResult = insertSubject.run(subject.name, subject.color, sIdx);
      const subjectId = subjectResult.lastInsertRowid as number;
      
      subject.topics.forEach((topic, tIdx) => {
        const topicResult = insertTopic.run(subjectId, topic.name, tIdx);
        const topicId = topicResult.lastInsertRowid as number;
        
        topic.subtopics.forEach((subtopic, stIdx) => {
          insertSubtopic.run(topicId, subtopic, stIdx);
        });
      });
    });
    
    // Insert active session recovery row
    db.prepare('INSERT OR IGNORE INTO active_session (id, session_data) VALUES (1, NULL)').run();
  });
  
  seedAll();
  seedSettings();
  
  log('Seed data inserted successfully.');
}

function seedSettings(): void {
  const db = getDatabase();
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  
  const seedSettingsTransaction = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value);
    }
  });
  
  seedSettingsTransaction();
}
