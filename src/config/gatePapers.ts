export interface SubtopicConfig {
  name: string;
}

export interface TopicConfig {
  name: string;
  subtopics: string[];
}

export interface SubjectConfig {
  name: string;
  color: string;
  topics: TopicConfig[];
}

export interface GatePaperConfig {
  code: 'CS' | 'EC';
  name: string;
  shortLabel: string;
  officialLabel: string;
  branches: string;
  description: string;
  subjects: SubjectConfig[];
}

export const COMMON_GENERAL_APTITUDE: SubjectConfig = {
  name: 'General Aptitude',
  color: '#8B5CF6',
  topics: [
    {
      name: 'Verbal Ability',
      subtopics: [
        'English Grammar',
        'Sentence Completion',
        'Verbal Analogies',
        'Word Groups',
        'Instructions',
        'Critical Reasoning',
        'Verbal Deduction',
      ],
    },
    {
      name: 'Quantitative Aptitude',
      subtopics: [
        'Data Interpretation',
        'Numerical Computation & Estimation',
        'Elementary Statistics & Probability',
        'Permutations & Combinations',
        'Progressions & Series',
      ],
    },
    {
      name: 'Analytical Aptitude',
      subtopics: [
        'Logic & Deduction',
        'Analogy & Relationships',
        'Numerical Reasoning',
        'Data Sufficiency',
      ],
    },
    {
      name: 'Spatial Aptitude',
      subtopics: [
        'Transformation of 2D & 3D Shapes',
        'Paper Folding & Cutting',
        'Patterns in 2D & 3D',
        'Spatial Reasoning & Grouping',
      ],
    },
  ],
};

export const GATE_PAPERS: Record<'CS' | 'EC', GatePaperConfig> = {
  CS: {
    code: 'CS',
    name: 'Computer Science and Information Technology',
    shortLabel: 'GATE CS',
    officialLabel: 'Computer Science & Information Technology (CS)',
    branches: 'CSE / IT',
    description: 'GATE Computer Science and Information Technology track for CS/IT aspirants',
    subjects: [
      COMMON_GENERAL_APTITUDE,
      {
        name: 'Engineering Mathematics',
        color: '#EC4899',
        topics: [
          { name: 'Linear Algebra', subtopics: ['Matrices', 'Determinants', 'Eigenvalues & Eigenvectors', 'System of Linear Equations', 'Vector Spaces', 'Basis & Dimension'] },
          { name: 'Calculus', subtopics: ['Limits, Continuity & Differentiability', 'Mean Value Theorems', 'Definite & Improper Integrals', 'Maxima & Minima', 'Multiple Integrals', 'Vector Calculus'] },
          { name: 'Probability & Statistics', subtopics: ['Random Variables', 'Distributions (Uniform, Normal, Exponential, Poisson, Binomial)', 'Mean, Median, Mode & Standard Deviation', 'Conditional Probability & Bayes Theorem'] },
          { name: 'Differential Equations', subtopics: ['First Order Linear & Non-linear Equations', 'Higher Order Linear Equations with Constant Coefficients', 'Cauchy & Euler Equations', 'Partial Differential Equations'] },
          { name: 'Complex Variables', subtopics: ['Analytic Functions', 'Cauchy-Riemann Equations', 'Cauchy Integral Theorem & Formula', 'Taylor & Laurent Series', 'Residue Theorem'] },
          { name: 'Numerical Methods', subtopics: ['Solutions of Non-linear Algebraic Equations', 'Polynomial Interpolation', 'Numerical Integration (Trapezoidal, Simpson)', 'Numerical Differentiation'] },
          { name: 'Transform Theory', subtopics: ['Laplace Transform', 'Fourier Transform', 'Z-Transform'] },
        ],
      },
      {
        name: 'Discrete Mathematics',
        color: '#06B6D4',
        topics: [
          { name: 'Propositional & First Order Logic', subtopics: ['Propositions', 'Connectives', 'Truth Tables', 'Logical Equivalence', 'Normal Forms', 'Predicates & Quantifiers', 'Inference Rules'] },
          { name: 'Sets, Relations & Functions', subtopics: ['Set Operations', 'Relations & Properties', 'Equivalence Relations', 'Partial Orders & Lattices', 'Functions & Pigeonhole Principle'] },
          { name: 'Combinatorics', subtopics: ['Counting Techniques', 'Permutations & Combinations', 'Inclusion-Exclusion', 'Generating Functions', 'Recurrence Relations'] },
          { name: 'Graph Theory', subtopics: ['Connectivity', 'Matching & Coloring', 'Planarity', 'Euler & Hamiltonian Paths', 'Isomorphism', 'Trees'] },
          { name: 'Group Theory', subtopics: ['Groups & Subgroups', 'Semi-Groups & Monoids', 'Cosets & Lagrange Theorem', 'Homomorphism & Isomorphism'] },
        ],
      },
      {
        name: 'Digital Logic',
        color: '#EF4444',
        topics: [
          { name: 'Boolean Algebra & Minimization', subtopics: ['Boolean Identities', 'Logic Gates', 'Canonical Forms', 'Karnaugh Maps', 'Quine-McCluskey Method'] },
          { name: 'Combinational Circuits', subtopics: ['Arithmetic Circuits (Adders, Subtractors)', 'Multiplexers & Demultiplexers', 'Encoders & Decoders', 'Comparators', 'Code Converters'] },
          { name: 'Sequential Circuits', subtopics: ['Latches & Flip-Flops', 'Counters (Synchronous & Asynchronous)', 'Shift Registers', 'Finite State Machines', 'Timing & Delays'] },
          { name: 'Number Representations', subtopics: ['Binary, Octal & Hexadecimal', 'Fixed & Floating Point', 'Complements & Overflow'] },
        ],
      },
      {
        name: 'Computer Organization & Architecture',
        color: '#F97316',
        topics: [
          { name: 'Machine Instructions & Addressing', subtopics: ['Instruction Formats', 'Addressing Modes', 'Instruction Set Architecture', 'RISC vs CISC'] },
          { name: 'ALU, Data Path & Control Unit', subtopics: ['ALU Design', 'Integer Arithmetic', 'Floating Point Arithmetic', 'Hardwired Control', 'Microprogrammed Control'] },
          { name: 'Instruction Pipelining', subtopics: ['Pipelining Basics', 'Pipeline Hazards (Structural, Data, Control)', 'Forwarding & Stalling', 'Branch Prediction', 'Performance Metrics (CPI, Speedup)'] },
          { name: 'Memory Hierarchy', subtopics: ['Cache Memory & Mapping Techniques', 'Cache Replacement & Write Policies', 'Main Memory', 'Virtual Memory & Page Tables', 'TLB & Memory Management'] },
          { name: 'I/O Interface & Storage', subtopics: ['Interrupts & Polling', 'Direct Memory Access (DMA)', 'Bus Architecture', 'Secondary Storage (Disks, SSDs, RAID)'] },
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
    ],
  },
  EC: {
    code: 'EC',
    name: 'Electronics and Communication Engineering',
    shortLabel: 'GATE EC',
    officialLabel: 'Electronics & Communication Engineering (EC)',
    branches: 'ENTC / ECE',
    description: 'Official GATE Electronics and Communication Engineering track for ECE / ENTC aspirants',
    subjects: [
      COMMON_GENERAL_APTITUDE,
      {
        name: 'Engineering Mathematics',
        color: '#EC4899',
        topics: [
          {
            name: 'Linear Algebra',
            subtopics: [
              'Vector Space & Basis',
              'Linear Dependence & Independence',
              'Matrix Algebra & Determinants',
              'Eigenvalues & Eigenvectors',
              'Rank of a Matrix',
              'Solution of Linear Equations (Existence & Uniqueness)',
            ],
          },
          {
            name: 'Calculus',
            subtopics: [
              'Mean Value Theorems',
              'Integral Calculus',
              'Definite & Improper Integrals',
              'Partial Derivatives',
              'Maxima & Minima',
              'Multiple Integrals',
              'Line, Surface & Volume Integrals',
              'Taylor Series Expansion',
            ],
          },
          {
            name: 'Differential Equations',
            subtopics: [
              'First-Order Differential Equations',
              'Higher-Order Linear Differential Equations with Constant Coefficients',
              'Cauchy & Euler Equations',
              'Method of Variation of Parameters',
              'Complementary Function & Particular Integral',
              'Partial Differential Equations',
              'Variable Separable Method',
              'Initial & Boundary Value Problems',
            ],
          },
          {
            name: 'Vector Analysis',
            subtopics: [
              'Vectors in Plane & Space',
              'Vector Operations & Products',
              'Gradient of Scalar Field',
              'Divergence of Vector Field',
              'Curl of Vector Field',
              'Gauss Divergence Theorem',
              'Green Theorem',
              'Stokes Theorem',
            ],
          },
          {
            name: 'Complex Analysis',
            subtopics: [
              'Analytic Functions & Cauchy-Riemann Equations',
              'Cauchy Integral Theorem',
              'Cauchy Integral Formula',
              'Sequences & Series',
              'Convergence Tests',
              'Taylor Series',
              'Laurent Series',
              'Residue Theorem & Evaluation of Integrals',
            ],
          },
          {
            name: 'Probability and Statistics',
            subtopics: [
              'Mean, Median, Mode & Standard Deviation',
              'Combinatorial Probability',
              'Probability Distributions',
              'Binomial Distribution',
              'Poisson Distribution',
              'Exponential Distribution',
              'Normal Distribution',
              'Joint Probability & Conditional Probability',
            ],
          },
        ],
      },
      {
        name: 'Networks, Signals and Systems',
        color: '#3B82F6',
        topics: [
          {
            name: 'Circuit Analysis',
            subtopics: [
              'Node & Mesh Analysis',
              'Superposition Theorem',
              'Thevenin Theorem',
              'Norton Theorem',
              'Reciprocity Theorem',
              'Sinusoidal Steady State & Phasors',
              'Complex Power',
              'Maximum Power Transfer Theorem',
              'Time Domain Analysis of RL, RC & RLC Circuits',
              'Laplace Transform in Circuit Analysis',
              '2-Port Network Parameters (Z, Y, ABCD, h)',
              'Wye-Delta Transformation',
            ],
          },
          {
            name: 'Continuous-time Signals',
            subtopics: [
              'Fourier Series Representation of Continuous Signals',
              'Fourier Transform & Properties',
              'Sampling Theorem & Reconstruction',
              'Applications of Continuous Transforms',
            ],
          },
          {
            name: 'Discrete-time Signals',
            subtopics: [
              'Discrete-Time Fourier Transform (DTFT)',
              'Discrete Fourier Transform (DFT & FFT)',
              'Z-Transform & Region of Convergence (ROC)',
              'Discrete-Time Processing of Continuous-Time Signals',
            ],
          },
          {
            name: 'LTI Systems',
            subtopics: [
              'Definition & Properties of LTI Systems',
              'Causality & Stability Analysis',
              'Impulse Response & Convolution Integral/Sum',
              'Poles & Zeros of System Functions',
              'Frequency Response of LTI Systems',
              'Group Delay & Phase Delay',
            ],
          },
        ],
      },
      {
        name: 'Electronic Devices',
        color: '#10B981',
        topics: [
          {
            name: 'Semiconductor Physics & Carrier Transport',
            subtopics: [
              'Energy Bands in Intrinsic & Extrinsic Semiconductors',
              'Equilibrium Carrier Concentration',
              'Direct & Indirect Band-Gap Semiconductors',
              'Carrier Transport (Diffusion Current & Drift Current)',
              'Carrier Mobility & Resistivity',
              'Generation & Recombination of Carriers',
              'Poisson Equation & Continuity Equation',
            ],
          },
          {
            name: 'P-N Junction & Diodes',
            subtopics: [
              'P-N Junction Physics & Depletion Region',
              'I-V Characteristics & Capacitance',
              'Zener Diode & Avalanche Breakdown',
              'Light Emitting Diode (LED)',
              'Photodiode & Solar Cell',
            ],
          },
          {
            name: 'Transistors & MOS Structures',
            subtopics: [
              'Bipolar Junction Transistor (BJT) Operation & Physics',
              'MOS Capacitor & C-V Characteristics',
              'MOSFET Operation & Current-Voltage Equations',
              'Short-Channel Effects in MOSFETs',
            ],
          },
        ],
      },
      {
        name: 'Analog Circuits',
        color: '#F59E0B',
        topics: [
          {
            name: 'Diode Circuits',
            subtopics: [
              'Clipping Circuits',
              'Clamping Circuits',
              'Rectifiers (Half-wave, Full-wave, Bridge)',
              'Zener Voltage Regulators',
            ],
          },
          {
            name: 'BJT Amplifiers',
            subtopics: [
              'BJT Biasing & Thermal Stability',
              'AC Coupling & Bypass Capacitors',
              'Small-Signal Analysis (CE, CB, CC Configs)',
              'Frequency Response of BJT Amplifiers',
            ],
          },
          {
            name: 'MOSFET Amplifiers',
            subtopics: [
              'MOSFET Biasing Techniques',
              'Small-Signal Analysis (CS, CG, CD Configs)',
              'Frequency Response of MOSFET Amplifiers',
            ],
          },
          {
            name: 'Current Mirrors & Differential Amplifiers',
            subtopics: [
              'Simple & Cascode Current Mirrors',
              'BJT & MOSFET Differential Amplifiers',
              'Common Mode Rejection Ratio (CMRR)',
              'Differential Gain & Common Mode Gain',
            ],
          },
          {
            name: 'Op-Amp Circuits',
            subtopics: [
              'Ideal & Practical Op-Amp Characteristics',
              'Inverting & Non-Inverting Amplifiers',
              'Summers, Integrators & Differentiators',
              'Active Filters (Low-pass, High-pass, Band-pass)',
              'Schmitt Triggers & Comparators',
              'Oscillators (RC Phase Shift, Wien Bridge, LC)',
            ],
          },
        ],
      },
      {
        name: 'Digital Circuits',
        color: '#EF4444',
        topics: [
          {
            name: 'Number Representations',
            subtopics: [
              'Binary, Octal, Hexadecimal Systems',
              'Integer Numbers & Complements (1s, 2s)',
              'IEEE 754 Floating-Point Numbers',
            ],
          },
          {
            name: 'Combinational Circuits',
            subtopics: [
              'Boolean Algebra & Identities',
              'Minimization & Karnaugh Maps',
              'Logic Gates & Static CMOS Implementations',
              'Arithmetic Circuits (Adders, Multipliers)',
              'Code Converters',
              'Multiplexers & Demultiplexers',
              'Decoders & Encoders',
            ],
          },
          {
            name: 'Sequential Circuits',
            subtopics: [
              'Latches & Flip-Flops (SR, JK, D, T)',
              'Synchronous & Asynchronous Counters',
              'Shift Registers',
              'Finite State Machines (Mealy & Moore)',
              'Propagation Delay, Setup Time & Hold Time',
              'Critical Path Delay & Maximum Operating Frequency',
            ],
          },
          {
            name: 'Data Converters',
            subtopics: [
              'Sample and Hold Circuits',
              'Analog-to-Digital Converters (ADC - Flash, SAR, Dual Slope)',
              'Digital-to-Analog Converters (DAC - Weighted Resistor, R-2R Ladder)',
              'Resolution & Quantization Noise',
            ],
          },
          {
            name: 'Semiconductor Memories',
            subtopics: [
              'Read Only Memory (ROM)',
              'Static RAM (SRAM)',
              'Dynamic RAM (DRAM)',
              'Memory Interfacing',
            ],
          },
          {
            name: 'Computer Organization',
            subtopics: [
              'Machine Instructions & Formats',
              'Addressing Modes',
              'ALU & Datapath Design',
              'Control Unit (Hardwired & Microprogrammed)',
              'Instruction Pipelining & Hazard Handling',
            ],
          },
        ],
      },
      {
        name: 'Control Systems',
        color: '#06B6D4',
        topics: [
          {
            name: 'System Modeling & Transfer Functions',
            subtopics: [
              'Basic Control System Components & Open vs Closed Loop',
              'Feedback Principle & Effects of Feedback',
              'Transfer Functions & Impulse Response',
              'Block Diagram Reduction Techniques',
              'Signal Flow Graphs & Mason Gain Formula',
            ],
          },
          {
            name: 'Time Domain Analysis & Stability',
            subtopics: [
              'Transient Response Analysis of First & Second Order Systems',
              'Steady-State Error & Error Constants',
              'LTI Systems Stability Analysis',
              'Routh-Hurwitz Stability Criterion',
            ],
          },
          {
            name: 'Frequency Domain Analysis & Stability',
            subtopics: [
              'Frequency Response & Bode Plots',
              'Nyquist Stability Criterion & Polar Plots',
              'Gain Margin & Phase Margin',
              'Root Locus Technique',
            ],
          },
          {
            name: 'Compensators & State Space Analysis',
            subtopics: [
              'Lag Compensation',
              'Lead Compensation',
              'Lag-Lead Compensation',
              'State Variable Model & State Transition Matrix',
              'State Equations of Linear Time-Invariant Systems',
              'Controllability & Observability Basics',
            ],
          },
        ],
      },
      {
        name: 'Communications',
        color: '#84CC16',
        topics: [
          {
            name: 'Random Processes',
            subtopics: [
              'Autocorrelation & Cross-Correlation Functions',
              'Power Spectral Density (PSD)',
              'White Noise & Additive Gaussian Noise',
              'Filtering Random Signals through LTI Systems',
            ],
          },
          {
            name: 'Analog Communications',
            subtopics: [
              'Amplitude Modulation (DSB-FC, DSB-SC, SSB-SC, VSB)',
              'AM Demodulation (Envelope Detector, Synchronous)',
              'Angle Modulation (Frequency & Phase Modulation)',
              'FM & PM Demodulation',
              'AM & FM Spectra & Bandwidth',
              'Superheterodyne Receivers & Image Frequency',
            ],
          },
          {
            name: 'Information Theory',
            subtopics: [
              'Entropy & Information Measures',
              'Mutual Information',
              'Shannon Channel Capacity Theorem',
              'Source Coding Basics',
            ],
          },
          {
            name: 'Digital Communications',
            subtopics: [
              'Pulse Code Modulation (PCM) & DPCM',
              'Digital Modulation (ASK, PSK, FSK, QAM, QPSK)',
              'Transmission Bandwidth & Spectral Efficiency',
              'Inter-Symbol Interference (ISI) & Nyquist Criterion',
              'Maximum A Posteriori (MAP) & Maximum Likelihood (ML) Detection',
              'Matched Filter Receiver & Correlator',
              'Signal-to-Noise Ratio (SNR) & Bit Error Rate (BER)',
              'Error Correction & Linear Block Codes',
              'Hamming Codes & Cyclic Redundancy Check (CRC)',
            ],
          },
        ],
      },
      {
        name: 'Electromagnetics',
        color: '#D946EF',
        topics: [
          {
            name: "Maxwell's Equations",
            subtopics: [
              "Differential & Integral Forms of Maxwell's Equations",
              'Physical Interpretation & Boundary Conditions',
              'Electromagnetic Wave Equation',
              'Poynting Vector & Power Density',
            ],
          },
          {
            name: 'Plane Waves',
            subtopics: [
              'Plane Wave Propagation in Lossless & Lossy Media',
              'Phase Velocity & Group Velocity',
              'Wave Polarization (Linear, Circular, Elliptical)',
              'Reflection & Refraction at Media Interfaces (Normal & Oblique)',
              'Skin Depth & Conductor Loss',
            ],
          },
          {
            name: 'Transmission Lines',
            subtopics: [
              'Transmission Line Equations & Primary Parameters (R, L, G, C)',
              'Characteristic Impedance & Propagation Constant',
              'Reflection Coefficient & Standing Wave Ratio (SWR)',
              'Impedance Transformation along Line',
              'Impedance Matching (Quarter-wave Transformer, Single Stub)',
              'S-Parameters (Scattering Parameters)',
              'Smith Chart Analysis',
            ],
          },
          {
            name: 'Waveguides & Optical Fibers',
            subtopics: [
              'Rectangular Waveguides (TE & TM Modes, Cutoff Frequency)',
              'Circular Waveguides Basics',
              'Optical Fiber Wave Propagation & Total Internal Reflection',
              'Numerical Aperture & V-Parameter',
              'Dispersion & Attenuation in Fibers',
            ],
          },
          {
            name: 'Antennas',
            subtopics: [
              'Radiation Fundamentals & Retarded Potentials',
              'Hertzian Dipole & Half-Wave Dipole Antenna',
              'Quarter-Wave Monopole Antenna',
              'Antenna Parameters (Radiation Pattern, Gain, Directivity, Radiation Resistance)',
              'Linear Antenna Arrays & Array Factor',
            ],
          },
        ],
      },
    ],
  },
};
