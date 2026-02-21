import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  WOLFRAM ALPHA UTILITY
//  Calls /api/wolfram proxy (Vercel serverless function).
//  AppID lives server-side in WOLFRAM_APP_ID env var — never
//  exposed to the browser.
// ═══════════════════════════════════════════════════════════════

async function wolframQuery(_appId, query) {
  // _appId is kept as a parameter for API compatibility but
  // the actual AppID is handled by the server-side proxy.
  if (!query || !query.trim()) return null;
  try {
    const url = `/api/wolfram?q=${encodeURIComponent(query.trim())}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.error) return { error: data.error };
    if (!data.result) return { error: "No result from Wolfram Alpha." };
    return { result: data.result };
  } catch (e) {
    return { error: `Proxy error: ${e.message}` };
  }
}

function openWolframTab(query) {
  window.open(`https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`, "_blank");
}

// ═══════════════════════════════════════════════════════════════
//  EXERCISE DATA — Hammack, Book of Proof Ed. 3.3 §1.1 → §2.6
// ═══════════════════════════════════════════════════════════════

const SECTIONS = {
  "1.1": { title: "Introduction to Sets", page: 3,
    defs: {
      "Set": "A collection of things called elements. a ∈ A means a is in A.",
      "Empty Set": "∅ = {} — no elements; |∅| = 0.",
      "Cardinality": "|A| = number of elements in A.",
      "Set-builder": "X = {expression : rule} — all values of expression satisfying rule.",
      "ℕ": "{1, 2, 3, 4, ...}", "ℤ": "{..., −2, −1, 0, 1, 2, ...}",
      "ℚ": "{m/n : m,n ∈ ℤ, n ≠ 0}", "ℝ": "All real numbers",
    }
  },
  "1.2": { title: "The Cartesian Product", page: 8,
    defs: {
      "Ordered pair": "(a, b) — equals (c,d) iff a=c and b=d.",
      "A × B": "{(a,b) : a ∈ A, b ∈ B}; |A×B| = |A|·|B|.",
      "ℝ²": "ℝ × ℝ — the real coordinate plane.",
    }
  },
  "1.3": { title: "Subsets", page: 12,
    defs: {
      "A ⊆ B": "Every element of A is in B (∀x, x∈A ⟹ x∈B).",
      "A ⊊ B": "A ⊆ B and A ≠ B (proper subset).",
      "∅ rule": "∅ ⊆ A for every set A (vacuously true).",
    }
  },
  "1.4": { title: "Power Sets", page: 15,
    defs: {
      "𝒫(A)": "The set of ALL subsets of A.",
      "|𝒫(A)|": "If |A| = n, then |𝒫(A)| = 2ⁿ.",
    }
  },
  "1.5": { title: "Union, Intersection, Difference", page: 18,
    defs: {
      "A ∪ B": "{x : x ∈ A or x ∈ B}",
      "A ∩ B": "{x : x ∈ A and x ∈ B}",
      "A − B": "{x : x ∈ A and x ∉ B}",
    }
  },
  "1.6": { title: "Complement", page: 20,
    defs: {
      "Ā": "U − A = {x ∈ U : x ∉ A}",
      "De Morgan (sets) 1": "(A ∪ B)̄ = Ā ∩ B̄",
      "De Morgan (sets) 2": "(A ∩ B)̄ = Ā ∪ B̄",
    }
  },
  "1.7": { title: "Venn Diagrams", page: 22,
    defs: {
      "Venn diagram": "Closed curves; shaded region represents the described set.",
      "Key rule": "Parentheses essential when mixing ∪ and ∩.",
    }
  },
  "2.1": { title: "Statements", page: 35,
    defs: {
      "Statement": "A declarative sentence that is either T or F (not both).",
      "Open sentence": "Contains a variable; truth depends on its value.",
    }
  },
  "2.2": { title: "And, Or, Not", page: 39,
    defs: {
      "P ∧ Q": "True only when both P and Q are true.",
      "P ∨ Q": "True when at least one of P, Q is true (inclusive or).",
      "¬P": "True when P is false.",
    }
  },
  "2.3": { title: "Conditional Statements", page: 42,
    defs: {
      "P ⟹ Q": "If P then Q. False ONLY when P=T and Q=F.",
      "Contrapositive": "¬Q ⟹ ¬P — logically equivalent to P ⟹ Q.",
      "Converse": "Q ⟹ P — NOT equivalent to P ⟹ Q.",
      "'P only if Q'": "Means P ⟹ Q.",
      "'Q whenever P'": "Means P ⟹ Q.",
    }
  },
  "2.4": { title: "Biconditional Statements", page: 46,
    defs: {
      "P ⟺ Q": "True when P and Q have the SAME truth value.",
      "Iff phrases": "'P iff Q', 'necessary and sufficient', 'P is equivalent to Q'.",
    }
  },
  "2.5": { title: "Truth Tables for Statements", page: 48,
    defs: {
      "Tautology": "A statement true for every assignment of truth values.",
      "Contradiction": "A statement false for every assignment of truth values.",
      "Compound statement": "Built using ∧, ∨, ¬, ⟹, ⟺.",
    }
  },
  "2.6": { title: "Logical Equivalence", page: 50,
    defs: {
      "P ≡ Q": "Logically equivalent — same truth table in every row.",
      "De Morgan 1": "¬(P ∧ Q) ≡ (¬P) ∨ (¬Q)",
      "De Morgan 2": "¬(P ∨ Q) ≡ (¬P) ∧ (¬Q)",
      "Contrapositive law": "P ⟹ Q ≡ (¬Q) ⟹ (¬P)",
      "Implication as disjunction": "P ⟹ Q ≡ (¬P) ∨ Q",
      "Distributive 1": "P ∧ (Q ∨ R) ≡ (P ∧ Q) ∨ (P ∧ R)",
      "Distributive 2": "P ∨ (Q ∧ R) ≡ (P ∨ Q) ∧ (P ∨ R)",
    }
  },
};

const EXERCISES = [
  // ──────────── §1.1 A ────────────
  { id:"1.1.A.1", sec:"1.1", part:"A",
    q:"Write {5x − 1 : x ∈ ℤ} by listing elements.",
    ans:"{..., −11, −6, −1, 4, 9, 14, ...}",
    hint:"Plug in x = ..., −2, −1, 0, 1, 2, ...",
    wolfram:"5x-1 for x = -3,-2,-1,0,1,2,3",
    type:"list",
    remix: () => { const a=randChoice([2,3,4,6,7]),b=randInt(-4,4); return {q:`Write {${a}x ${b>=0?'+':'−'} ${Math.abs(b)} : x ∈ ℤ} by listing elements.`, ans:`{..., ${a*-2+b}, ${a*-1+b}, ${a*0+b}, ${a*1+b}, ${a*2+b}, ...}`, wolfram:`${a}x${b>=0?'+'+b:b} for x=-2,-1,0,1,2`}; }
  },
  { id:"1.1.A.2", sec:"1.1", part:"A",
    q:"Write {3x + 2 : x ∈ ℤ} by listing elements.",
    ans:"{..., −4, −1, 2, 5, 8, 11, ...}",
    hint:"Plug in x = ..., −2, −1, 0, 1, 2, ...",
    wolfram:"3x+2 for x=-2,-1,0,1,2,3",
    type:"list" },
  { id:"1.1.A.3", sec:"1.1", part:"A",
    q:"Write {x ∈ ℤ : −2 ≤ x < 7} by listing elements.",
    ans:"{−2, −1, 0, 1, 2, 3, 4, 5, 6}",
    hint:"All integers from −2 up to (not including) 7.",
    wolfram:"integers from -2 to 6",
    type:"list" },
  { id:"1.1.A.4", sec:"1.1", part:"A",
    q:"Write {x ∈ ℕ : −2 < x ≤ 7} by listing elements.",
    ans:"{1, 2, 3, 4, 5, 6, 7}",
    hint:"ℕ starts at 1; take naturals ≤ 7.",
    wolfram:"natural numbers from 1 to 7",
    type:"list" },
  { id:"1.1.A.5", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : x² = 3} by listing elements.",
    ans:"{√3, −√3}",
    hint:"Solve x² = 3 over ℝ.",
    wolfram:"solve x^2 = 3",
    type:"list" },
  { id:"1.1.A.6", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : x² = 9} by listing elements.",
    ans:"{3, −3}",
    hint:"Solve x² = 9.",
    wolfram:"solve x^2 = 9",
    type:"list" },
  { id:"1.1.A.7", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : x² + 5x = −6} by listing elements.",
    ans:"{−2, −3}",
    hint:"Factor x² + 5x + 6 = (x+2)(x+3) = 0.",
    wolfram:"solve x^2 + 5x + 6 = 0",
    type:"list" },
  { id:"1.1.A.8", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : x³ + 5x² = −6x} by listing elements.",
    ans:"{0, −2, −3}",
    hint:"Factor: x(x² + 5x + 6) = x(x+2)(x+3) = 0.",
    wolfram:"solve x^3 + 5x^2 + 6x = 0",
    type:"list" },
  { id:"1.1.A.9", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : sin(πx) = 0} by listing elements.",
    ans:"{..., −2, −1, 0, 1, 2, ...} = ℤ",
    hint:"sin(πx) = 0 iff x = n for n ∈ ℤ.",
    wolfram:"solve sin(pi*x) = 0",
    type:"list" },
  { id:"1.1.A.10", sec:"1.1", part:"A",
    q:"Write {x ∈ ℝ : cos(x) = 1} by listing elements.",
    ans:"{..., −2π, 0, 2π, 4π, ...} = {2kπ : k ∈ ℤ}",
    hint:"cos(x) = 1 iff x = 2kπ for k ∈ ℤ.",
    wolfram:"solve cos(x) = 1",
    type:"list" },
  { id:"1.1.A.11", sec:"1.1", part:"A",
    q:"Write {x ∈ ℤ : |x| < 5} by listing elements.",
    ans:"{−4, −3, −2, −1, 0, 1, 2, 3, 4}",
    hint:"All integers with absolute value less than 5.",
    wolfram:"integers x with |x| < 5",
    type:"list",
    remix: () => { const n=randChoice([4,5,6,7,8]); const els=[...Array(2*n-1)].map((_,i)=>i-(n-1)); return {q:`Write {x ∈ ℤ : |x| < ${n}} by listing elements.`, ans:`{${els.join(', ')}}`, wolfram:`integers x with |x| < ${n}`}; }
  },
  { id:"1.1.A.12", sec:"1.1", part:"A",
    q:"Write {x ∈ ℤ : |2x| < 5} by listing elements.",
    ans:"{−2, −1, 0, 1, 2}",
    hint:"|2x| < 5 means |x| < 2.5, so x ∈ {−2,−1,0,1,2}.",
    wolfram:"integers x with |2x| < 5",
    type:"list" },
  { id:"1.1.A.13", sec:"1.1", part:"A",
    q:"Write {x ∈ ℤ : |6x| < 5} by listing elements.",
    ans:"{0}",
    hint:"|6x| < 5 means |x| < 5/6 < 1, so x = 0 only.",
    wolfram:"integers x with |6x| < 5",
    type:"list" },
  { id:"1.1.A.14", sec:"1.1", part:"A",
    q:"Write {5x : x ∈ ℤ, |2x| ≤ 8} by listing elements.",
    ans:"{−20, −15, −10, −5, 0, 5, 10, 15, 20}",
    hint:"|2x| ≤ 8 means x ∈ {−4,...,4}; multiply each by 5.",
    wolfram:"5x for x = -4,-3,-2,-1,0,1,2,3,4",
    type:"list" },
  { id:"1.1.A.15", sec:"1.1", part:"A",
    q:"Write {5a + 2b : a, b ∈ ℤ} by listing elements.",
    ans:"ℤ (all integers), since gcd(5, 2) = 1",
    hint:"gcd(5,2)=1 so every integer n = 5a+2b for some a,b ∈ ℤ.",
    wolfram:"gcd(5,2)",
    type:"list" },
  { id:"1.1.A.16", sec:"1.1", part:"A",
    q:"Write {6a + 2b : a, b ∈ ℤ} by listing elements.",
    ans:"2ℤ = {..., −4, −2, 0, 2, 4, ...} (all even integers)",
    hint:"6a+2b = 2(3a+b); since 3a+b runs over all ℤ, the set = 2ℤ.",
    wolfram:"gcd(6,2)",
    type:"list" },
  // ──────────── §1.1 B ────────────
  { id:"1.1.B.17", sec:"1.1", part:"B",
    q:"Write {2, 4, 8, 16, 32, 64, ...} in set-builder notation.",
    ans:"{2ⁿ : n ∈ ℕ}",
    hint:"Each element is a power of 2.",
    wolfram:"2^n for n=1,2,3,4,5,6",
    type:"builder" },
  { id:"1.1.B.18", sec:"1.1", part:"B",
    q:"Write {0, 4, 16, 36, 64, 100, ...} in set-builder notation.",
    ans:"{(2n)² : n ∈ ℕ ∪ {0}} = {4n² : n ≥ 0}",
    hint:"Squares of even numbers: 0=0², 4=2², 16=4², ...",
    wolfram:"(2n)^2 for n=0,1,2,3,4,5",
    type:"builder" },
  { id:"1.1.B.19", sec:"1.1", part:"B",
    q:"Write {..., −6, −3, 0, 3, 6, 9, 12, 15, ...} in set-builder notation.",
    ans:"{3n : n ∈ ℤ}",
    hint:"Multiples of 3.",
    wolfram:"3n for n=-2,-1,0,1,2,3,4,5",
    type:"builder" },
  { id:"1.1.B.20", sec:"1.1", part:"B",
    q:"Write {..., −8, −3, 2, 7, 12, 17, ...} in set-builder notation.",
    ans:"{5n + 2 : n ∈ ℤ}",
    hint:"Consecutive terms differ by 5; one value is 2 = 5(0)+2.",
    wolfram:"5n+2 for n=-2,-1,0,1,2,3",
    type:"builder" },
  { id:"1.1.B.21", sec:"1.1", part:"B",
    q:"Write {0, 1, 4, 9, 16, 25, 36, ...} in set-builder notation.",
    ans:"{n² : n ∈ ℕ ∪ {0}}",
    hint:"Perfect squares starting from 0.",
    wolfram:"n^2 for n=0,1,2,3,4,5,6",
    type:"builder" },
  { id:"1.1.B.22", sec:"1.1", part:"B",
    q:"Write {3, 6, 11, 18, 27, 38, ...} in set-builder notation.",
    ans:"{n² + 2 : n ∈ ℕ}",
    hint:"1²+2=3, 2²+2=6, 3²+2=11, ...",
    wolfram:"n^2+2 for n=1,2,3,4,5,6",
    type:"builder" },
  { id:"1.1.B.23", sec:"1.1", part:"B",
    q:"Write {3, 4, 5, 6, 7, 8} in set-builder notation.",
    ans:"{x ∈ ℤ : 3 ≤ x ≤ 8}",
    hint:"Integers from 3 to 8 inclusive.",
    wolfram:"integers from 3 to 8",
    type:"builder" },
  { id:"1.1.B.24", sec:"1.1", part:"B",
    q:"Write {−4, −3, −2, −1, 0, 1, 2} in set-builder notation.",
    ans:"{x ∈ ℤ : −4 ≤ x ≤ 2}",
    hint:"Integers from −4 to 2 inclusive.",
    wolfram:"integers from -4 to 2",
    type:"builder" },
  { id:"1.1.B.25", sec:"1.1", part:"B",
    q:"Write {..., 1/8, 1/4, 1/2, 1, 2, 4, 8, ...} in set-builder notation.",
    ans:"{2ⁿ : n ∈ ℤ}",
    hint:"Powers of 2 for all integer exponents.",
    wolfram:"2^n for n=-3,-2,-1,0,1,2,3",
    type:"builder" },
  { id:"1.1.B.26", sec:"1.1", part:"B",
    q:"Write {..., 1/27, 1/9, 1/3, 1, 3, 9, 27, ...} in set-builder notation.",
    ans:"{3ⁿ : n ∈ ℤ}",
    hint:"Powers of 3 for all integer exponents.",
    wolfram:"3^n for n=-3,-2,-1,0,1,2,3",
    type:"builder" },
  { id:"1.1.B.27", sec:"1.1", part:"B",
    q:"Write {..., −π, −π/2, 0, π/2, π, 3π/2, 2π, ...} in set-builder notation.",
    ans:"{nπ/2 : n ∈ ℤ}",
    hint:"Multiples of π/2.",
    wolfram:"n*pi/2 for n=-2,-1,0,1,2,3,4",
    type:"builder" },
  { id:"1.1.B.28", sec:"1.1", part:"B",
    q:"Write {..., −3/2, −3/4, 0, 3/4, 3/2, 9/4, 3, ...} in set-builder notation.",
    ans:"{3n/4 : n ∈ ℤ}",
    hint:"Multiples of 3/4.",
    wolfram:"3n/4 for n=-2,-1,0,1,2,3,4",
    type:"builder" },
  // ──────────── §1.1 C ────────────
  { id:"1.1.C.29", sec:"1.1", part:"C",
    q:"Find |{{1}, {2,{3,4}}, ∅}|.",
    ans:"3",
    hint:"Count the top-level elements (each brace-group = 1 element).",
    wolfram:"cardinality of {{1},{2,{3,4}},{}} = 3 elements",
    type:"cardinality",
    remix: () => { const n=randChoice([2,3,4,5]); return {q:`A set has ${n} elements. What is its cardinality?`, ans:`${n}`, wolfram:`cardinality ${n}`}; }
  },
  { id:"1.1.C.30", sec:"1.1", part:"C",
    q:"Find |{{1,4}, a, b, {{3,4}}, {∅}}|.",
    ans:"5",
    hint:"Five elements: {1,4}, a, b, {{3,4}}, {∅}.",
    wolfram:"5 elements in the set",
    type:"cardinality" },
  { id:"1.1.C.33", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℤ : |x| < 10}|.",
    ans:"19",
    hint:"Integers from −9 to 9: that's 2(9)+1 = 19.",
    wolfram:"number of integers x with |x| < 10",
    type:"cardinality",
    remix: () => { const n=randChoice([5,6,7,8,10,12]); return {q:`Find |{x ∈ ℤ : |x| < ${n}}|.`, ans:`${2*n-1}`, wolfram:`number of integers x with |x| < ${n}`}; }
  },
  { id:"1.1.C.34", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℕ : |x| < 10}|.",
    ans:"9",
    hint:"Naturals 1 through 9.",
    wolfram:"natural numbers less than 10",
    type:"cardinality" },
  { id:"1.1.C.35", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℤ : x² < 10}|.",
    ans:"7",
    hint:"x² < 10 means |x| ≤ 3 in ℤ: {−3,−2,−1,0,1,2,3}.",
    wolfram:"integers x with x^2 < 10",
    type:"cardinality" },
  { id:"1.1.C.36", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℕ : x² < 10}|.",
    ans:"3",
    hint:"x=1,2,3 work (1,4,9 < 10); x=4 fails (16 ≥ 10).",
    wolfram:"natural numbers x with x^2 < 10",
    type:"cardinality" },
  { id:"1.1.C.37", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℕ : x² < 0}|.",
    ans:"0 (empty set — |∅| = 0)",
    hint:"x² ≥ 0 for all real x, so no natural satisfies x² < 0.",
    wolfram:"natural numbers x with x^2 < 0",
    type:"cardinality" },
  { id:"1.1.C.38", sec:"1.1", part:"C",
    q:"Find |{x ∈ ℕ : 5x ≤ 20}|.",
    ans:"4",
    hint:"5x ≤ 20 means x ≤ 4; naturals: {1,2,3,4}.",
    wolfram:"natural numbers x with 5x <= 20",
    type:"cardinality" },
  // ──────────── §1.2 ────────────
  { id:"1.2.A.1", sec:"1.2", part:"A",
    q:"Find A × B for A = {1, 2, 3} and B = {a, b}.",
    ans:"{(1,a),(1,b),(2,a),(2,b),(3,a),(3,b)}",
    hint:"Pair each element of A with each element of B.",
    wolfram:"{1,2,3} cross product {a,b}",
    type:"list" },
  { id:"1.2.A.2", sec:"1.2", part:"A",
    q:"If |A| = 4 and |A × B| = 20, find |B|.",
    ans:"|B| = 5, since |A × B| = |A|·|B| = 4·5 = 20.",
    hint:"Use |A × B| = |A|·|B|.",
    wolfram:"20/4 = 5",
    type:"list" },
  { id:"1.2.A.3", sec:"1.2", part:"A",
    q:"Write out {0,1} × {0,1} × {0,1}.",
    ans:"{(0,0,0),(0,0,1),(0,1,0),(0,1,1),(1,0,0),(1,0,1),(1,1,0),(1,1,1)}",
    hint:"All binary triples — 2³ = 8 elements.",
    wolfram:"{0,1}^3 number of elements = 8",
    type:"list" },
  // ──────────── §1.3 ────────────
  { id:"1.3.A.1", sec:"1.3", part:"A",
    q:"List all subsets of A = {1, 2, 3}.",
    ans:"∅, {1}, {2}, {3}, {1,2}, {1,3}, {2,3}, {1,2,3}  (2³ = 8 total)",
    hint:"A set with n elements has 2ⁿ subsets.",
    wolfram:"subsets of {1,2,3}",
    type:"list",
    remix: () => { const n=randChoice([2,3]); const s=n===2?[1,2]:[1,2,3]; return {q:`List all subsets of {${s.join(',')}}.`, ans:`2^${n} = ${Math.pow(2,n)} subsets total`, wolfram:`subsets of {${s.join(',')}}`}; }
  },
  { id:"1.3.A.2", sec:"1.3", part:"A",
    q:"True or False: {2, 3} ⊆ {1, 2, 3, 4}.",
    ans:"TRUE — every element of {2,3} is in {1,2,3,4}.",
    hint:"Check each element: 2 ∈ {1,2,3,4} ✓, 3 ∈ {1,2,3,4} ✓.",
    wolfram:"{2,3} subset of {1,2,3,4}",
    type:"tfq" },
  { id:"1.3.A.3", sec:"1.3", part:"A",
    q:"True or False: {1, 5} ⊆ {1, 2, 3, 4}.",
    ans:"FALSE — 5 ∉ {1,2,3,4}.",
    hint:"5 is not in the second set.",
    wolfram:"{1,5} subset of {1,2,3,4} = false",
    type:"tfq" },
  { id:"1.3.A.4", sec:"1.3", part:"A",
    q:"True or False: ∅ ⊆ {1, 2, 3}.",
    ans:"TRUE — ∅ is a subset of every set (vacuously true).",
    hint:"No element of ∅ fails to be in any set — there are none!",
    wolfram:"empty set is subset of every set",
    type:"tfq" },
  // ──────────── §1.4 ────────────
  { id:"1.4.A.1", sec:"1.4", part:"A",
    q:"Find 𝒫({1, 2}).",
    ans:"{∅, {1}, {2}, {1,2}}  (4 = 2² elements)",
    hint:"Enumerate all subsets of {1,2}.",
    wolfram:"power set of {1,2}",
    type:"list" },
  { id:"1.4.A.2", sec:"1.4", part:"A",
    q:"Find 𝒫(∅).",
    ans:"{∅}  (1 = 2⁰ element)",
    hint:"The only subset of ∅ is ∅ itself.",
    wolfram:"power set of empty set",
    type:"list" },
  { id:"1.4.A.3", sec:"1.4", part:"A",
    q:"How many elements does 𝒫(𝒫({a,b})) have?",
    ans:"2^(2²) = 2⁴ = 16",
    hint:"|{a,b}|=2, so |𝒫({a,b})|=4, so |𝒫(𝒫({a,b}))|=2⁴=16.",
    wolfram:"2^(2^2)",
    type:"cardinality",
    remix: () => { const n=randChoice([1,2,3]); return {q:`How many elements does 𝒫({1,...,${n}}) have?`, ans:`2^${n} = ${Math.pow(2,n)}`, wolfram:`2^${n}`}; }
  },
  // ──────────── §1.5 ────────────
  { id:"1.5.A.1", sec:"1.5", part:"A",
    q:"Let A={4,3,6,7,1,9}, B={5,6,8,4}. Find A∪B and A∩B.",
    ans:"A∪B = {1,3,4,5,6,7,8,9};  A∩B = {4,6}",
    hint:"Union: combine all; Intersection: only common elements.",
    wolfram:"union and intersection of {4,3,6,7,1,9} and {5,6,8,4}",
    type:"list" },
  { id:"1.5.A.2", sec:"1.5", part:"A",
    q:"For intervals: find [2,5] ∪ [3,6],  [2,5] ∩ [3,6],  and [2,5] − [3,6].",
    ans:"[2,5]∪[3,6] = [2,6];  [2,5]∩[3,6] = [3,5];  [2,5]−[3,6] = [2,3)",
    hint:"Sketch both intervals on a number line.",
    wolfram:"[2,5] union [3,6], [2,5] intersect [3,6]",
    type:"list" },
  // ──────────── §1.6 ────────────
  { id:"1.6.A.1", sec:"1.6", part:"A",
    q:"Let U={1,...,10}, A={2,4,6,8,10}. Find Ā.",
    ans:"{1,3,5,7,9}",
    hint:"Ā = U − A = all elements of U not in A.",
    wolfram:"{1,2,...,10} minus {2,4,6,8,10}",
    type:"list" },
  { id:"1.6.A.2", sec:"1.6", part:"A",
    q:"Verify De Morgan's law: Let U={1,...,10}, A={2,4,6,8,10}, B={1,2,3,4,5}. Show (A∪B)̄ = Ā∩B̄.",
    ans:"A∪B={1,2,3,4,5,6,8,10}, (A∪B)̄={7,9}\nĀ={1,3,5,7,9}, B̄={6,7,8,9,10}, Ā∩B̄={7,9} ✓",
    hint:"Compute each side separately and verify they're equal.",
    wolfram:"complement of ({2,4,6,8,10} union {1,2,3,4,5}) in {1,...,10}",
    type:"list" },
  // ──────────── §2.1 ────────────
  { id:"2.1.A.1", sec:"2.1", part:"A",
    q:"Is 'The number 3 is odd.' a statement? If so, is it T or F?",
    ans:"Yes, it is a statement. It is TRUE.",
    hint:"Statements are declarative sentences with a definite truth value.",
    wolfram:"3 is odd",
    type:"tfq" },
  { id:"2.1.A.2", sec:"2.1", part:"A",
    q:"Is 'x + 3 = 8' a statement?",
    ans:"No — it is an open sentence. Truth depends on x.",
    hint:"Open sentences contain free variables.",
    wolfram:"x + 3 = 8 is an open sentence",
    type:"tfq" },
  { id:"2.1.A.3", sec:"2.1", part:"A",
    q:"Is 'Every even integer greater than 2 is the sum of two primes.' a statement?",
    ans:"Yes — this is Goldbach's Conjecture. It IS a statement (T or F, even if unknown).",
    hint:"Declarative sentence → statement, regardless of whether we know its truth value.",
    wolfram:"Goldbach's conjecture",
    type:"tfq" },
  // ──────────── §2.2 ────────────
  { id:"2.2.A.1", sec:"2.2", part:"A",
    q:"Symbolize: 'The number 8 is both even and a power of 2.'",
    ans:"P ∧ Q  where P: '8 is even', Q: '8 is a power of 2'.",
    hint:"'Both ... and ...' → conjunction ∧.",
    wolfram:"8 is even AND 8 is a power of 2",
    type:"list" },
  { id:"2.2.A.2", sec:"2.2", part:"A",
    q:"Symbolize: 'At least one of x and y equals 0.'",
    ans:"P ∨ Q  where P: 'x = 0', Q: 'y = 0'.",
    hint:"'At least one' → inclusive or ∨.",
    wolfram:"x=0 or y=0",
    type:"list" },
  { id:"2.2.A.3", sec:"2.2", part:"A",
    q:"Symbolize: 'x ∈ A − B'.",
    ans:"P ∧ ¬Q  where P: 'x ∈ A', Q: 'x ∈ B'.",
    hint:"x ∈ A−B means x ∈ A AND x ∉ B.",
    wolfram:"x in A and x not in B",
    type:"list" },
  { id:"2.2.A.4", sec:"2.2", part:"A",
    q:"Give the truth table for P ∧ Q.",
    ans:"TT→T, TF→F, FT→F, FF→F",
    hint:"True ONLY when both are true.",
    wolfram:"truth table P AND Q",
    type:"truth_table",
    vars:["P","Q"], formula:"P ∧ Q",
    rows:[["T","T","T"],["T","F","F"],["F","T","F"],["F","F","F"]] },
  { id:"2.2.A.5", sec:"2.2", part:"A",
    q:"Give the truth table for P ∨ Q.",
    ans:"TT→T, TF→T, FT→T, FF→F",
    hint:"False ONLY when both are false.",
    wolfram:"truth table P OR Q",
    type:"truth_table",
    vars:["P","Q"], formula:"P ∨ Q",
    rows:[["T","T","T"],["T","F","T"],["F","T","T"],["F","F","F"]] },
  // ──────────── §2.3 ────────────
  { id:"2.3.A.1", sec:"2.3", part:"A",
    q:"Convert: 'An integer is divisible by 8 only if it is divisible by 4.' to 'If P, then Q' form.",
    ans:"If an integer is divisible by 8, then it is divisible by 4.",
    hint:"'P only if Q' means P ⟹ Q.",
    wolfram:"8 divides n implies 4 divides n",
    type:"list" },
  { id:"2.3.A.2", sec:"2.3", part:"A",
    q:"Give the truth table for P ⟹ Q.",
    ans:"TT→T, TF→F, FT→T, FF→T",
    hint:"The ONLY false row is when P=T and Q=F.",
    wolfram:"truth table P implies Q",
    type:"truth_table",
    vars:["P","Q"], formula:"P ⟹ Q",
    rows:[["T","T","T"],["T","F","F"],["F","T","T"],["F","F","T"]] },
  { id:"2.3.A.3", sec:"2.3", part:"A",
    q:"What is the contrapositive of 'If n is even, then n² is even'?",
    ans:"If n² is odd, then n is odd.  (¬Q ⟹ ¬P)",
    hint:"Contrapositive: negate both and flip direction.",
    wolfram:"contrapositive of if n is even then n^2 is even",
    type:"list" },
  { id:"2.3.A.4", sec:"2.3", part:"A",
    q:"Is the contrapositive logically equivalent to the original conditional?",
    ans:"YES — P ⟹ Q ≡ ¬Q ⟹ ¬P. They have identical truth tables.",
    hint:"Verify with a 4-row truth table.",
    wolfram:"P implies Q equivalent to not Q implies not P",
    type:"tfq" },
  // ──────────── §2.4 ────────────
  { id:"2.4.A.1", sec:"2.4", part:"A",
    q:"Convert to iff form: 'If xy = 0 then x = 0 or y = 0, and conversely.'",
    ans:"xy = 0 if and only if x = 0 or y = 0.",
    hint:"'and conversely' always indicates an iff statement.",
    wolfram:"xy = 0 iff x=0 or y=0",
    type:"list" },
  { id:"2.4.A.2", sec:"2.4", part:"A",
    q:"Give the truth table for P ⟺ Q.",
    ans:"TT→T, TF→F, FT→F, FF→T",
    hint:"True exactly when P and Q have the SAME truth value.",
    wolfram:"truth table P iff Q",
    type:"truth_table",
    vars:["P","Q"], formula:"P ⟺ Q",
    rows:[["T","T","T"],["T","F","F"],["F","T","F"],["F","F","T"]] },
  // ──────────── §2.5 ────────────
  { id:"2.5.A.1", sec:"2.5", part:"A",
    q:"Build the truth table for P ∨ (Q ⟹ R).",
    ans:"(P,Q,R)=(T,T,T)→T; (T,T,F)→T; (T,F,T)→T; (T,F,F)→T; (F,T,T)→T; (F,T,F)→F; (F,F,T)→T; (F,F,F)→T",
    hint:"First build Q⟹R column, then apply P∨(Q⟹R).",
    wolfram:"truth table P OR (Q implies R)",
    type:"truth_table",
    vars:["P","Q","R"], formula:"P ∨ (Q ⟹ R)",
    rows:[["T","T","T","T"],["T","T","F","T"],["T","F","T","T"],["T","F","F","T"],
          ["F","T","T","T"],["F","T","F","F"],["F","F","T","T"],["F","F","F","T"]] },
  { id:"2.5.A.2", sec:"2.5", part:"A",
    q:"Build the truth table for ¬(P ⟹ Q).",
    ans:"TT→F, TF→T, FT→F, FF→F  (true ONLY in the TF row)",
    hint:"¬(P⟹Q) is true only when P=T, Q=F.",
    wolfram:"truth table NOT (P implies Q)",
    type:"truth_table",
    vars:["P","Q"], formula:"¬(P ⟹ Q)",
    rows:[["T","T","F"],["T","F","T"],["F","T","F"],["F","F","F"]] },
  { id:"2.5.A.3", sec:"2.5", part:"A",
    q:"Build the truth table for (P ∧ ¬P) ⟹ Q.",
    ans:"All four rows → T. This is a tautology (false hypothesis ⟹ anything is T).",
    hint:"P ∧ ¬P is always F; F ⟹ Q is always T.",
    wolfram:"truth table (P AND NOT P) implies Q",
    type:"truth_table",
    vars:["P","Q"], formula:"(P ∧ ¬P) ⟹ Q",
    rows:[["T","T","T"],["T","F","T"],["F","T","T"],["F","F","T"]] },
  { id:"2.5.A.4", sec:"2.5", part:"A",
    q:"Build the truth table for ¬(¬P ∨ ¬Q).",
    ans:"TT→T, TF→F, FT→F, FF→F  (same as P ∧ Q — De Morgan!)",
    hint:"By De Morgan: ¬(¬P ∨ ¬Q) = ¬¬P ∧ ¬¬Q = P ∧ Q.",
    wolfram:"truth table NOT(NOT P OR NOT Q)",
    type:"truth_table",
    vars:["P","Q"], formula:"¬(¬P ∨ ¬Q)",
    rows:[["T","T","T"],["T","F","F"],["F","T","F"],["F","F","F"]] },
  { id:"2.5.A.5", sec:"2.5", part:"A",
    q:"Suppose ((P∧Q)∨R) ⟹ (R∨S) is false. Find the truth values of P,Q,R,S.",
    ans:"P=T, Q=T, R=F, S=F. (Hypothesis must be T, conclusion F; R∨S=F requires R=F,S=F; then (T∧T)∨F=T ✓)",
    hint:"A conditional is false only when hypothesis=T and conclusion=F. Work backwards.",
    wolfram:"(P AND Q OR R) implies (R OR S) is false",
    type:"list" },
  // ──────────── §2.6 ────────────
  { id:"2.6.A.1", sec:"2.6", part:"A",
    q:"Use a truth table to show ¬(P ∧ Q) ≡ (¬P) ∨ (¬Q). (De Morgan's 1st Law)",
    ans:"Both columns agree on all 4 rows: TT→F/F, TF→T/T, FT→T/T, FF→T/T ✓",
    hint:"Build a 4-row table with columns for both sides and compare.",
    wolfram:"truth table NOT(P AND Q) = (NOT P) OR (NOT Q)",
    type:"truth_table",
    vars:["P","Q"], formula:"¬(P ∧ Q)  vs  (¬P) ∨ (¬Q)",
    rows:[["T","T","F","F"],["T","F","T","T"],["F","T","T","T"],["F","F","T","T"]] },
  { id:"2.6.A.2", sec:"2.6", part:"A",
    q:"Use a truth table to show P ⟹ Q ≡ (¬P) ∨ Q.",
    ans:"Both columns agree: TT→T/T, TF→F/F, FT→T/T, FF→T/T ✓",
    hint:"'If P then Q' is the same as 'P is false or Q is true.'",
    wolfram:"truth table P implies Q = (NOT P) OR Q",
    type:"truth_table",
    vars:["P","Q"], formula:"P ⟹ Q  vs  (¬P) ∨ Q",
    rows:[["T","T","T","T"],["T","F","F","F"],["F","T","T","T"],["F","F","T","T"]] },
  { id:"2.6.A.3", sec:"2.6", part:"A",
    q:"Are P ∨ (Q ∧ R) and (P ∨ Q) ∧ R logically equivalent?",
    ans:"NO — counterexample: P=T, Q=F, R=F gives T vs F.",
    hint:"Try P=T, Q=R=F: LHS = T∨(F∧F)=T, RHS = (T∨F)∧F = F.",
    wolfram:"truth table P OR (Q AND R) vs (P OR Q) AND R",
    type:"tfq" },
  { id:"2.6.A.4", sec:"2.6", part:"A",
    q:"Are ¬(P ⟹ Q) and P ∧ ¬Q logically equivalent?",
    ans:"YES — ¬(P⟹Q) is true only when P=T,Q=F, same as P∧¬Q.",
    hint:"Check all 4 rows — both are true only in the TF row.",
    wolfram:"NOT(P implies Q) equivalent to P AND NOT Q",
    type:"tfq" },
  { id:"2.6.A.5", sec:"2.6", part:"A",
    q:"State and explain De Morgan's 2nd law for logic.",
    ans:"¬(P ∨ Q) ≡ (¬P) ∧ (¬Q). 'Not (P or Q)' = 'not P and not Q'. Verified by 4-row truth table.",
    hint:"Flip ∨ to ∧ and negate both sides.",
    wolfram:"De Morgan NOT(P OR Q) = (NOT P) AND (NOT Q)",
    type:"list" },
];

// ── Remix helpers ──────────────────────────────────────────
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function remixExercise(ex) {
  if (ex.remix) {
    const remixed = ex.remix();
    return { ...ex, ...remixed, _remixed: true };
  }
  return ex;
}

// ── Group by section ──────────────────────────────────────
const EXERCISE_BY_SECTION = {};
EXERCISES.forEach(ex => {
  if (!EXERCISE_BY_SECTION[ex.sec]) EXERCISE_BY_SECTION[ex.sec] = {};
  if (!EXERCISE_BY_SECTION[ex.sec][ex.part]) EXERCISE_BY_SECTION[ex.sec][ex.part] = [];
  EXERCISE_BY_SECTION[ex.sec][ex.part].push(ex);
});

// ═══════════════════════════════════════════════════════════════
//  EXISTING DATA (kept intact)
// ═══════════════════════════════════════════════════════════════

const FLASHCARD_DECKS = {
  "Page 1 — Logic Laws & Set Notation": [
    { q: "¬(P ∧ Q) ≡ ?", a: "¬P ∨ ¬Q", hint: "De Morgan: flip AND→OR, negate each", law: "De Morgan #1 (p.51)" },
    { q: "¬(P ∨ Q) ≡ ?", a: "¬P ∧ ¬Q", hint: "De Morgan: flip OR→AND, negate each", law: "De Morgan #2 (p.51)" },
    { q: "P ⟹ Q ≡ ? (contrapositive)", a: "¬Q ⟹ ¬P", hint: "Negate both sides and flip direction", law: "Contrapositive Law (p.51)" },
    { q: "P ⟹ Q ≡ ? (as disjunction)", a: "¬P ∨ Q", hint: "If P fails OR Q holds", law: "Implication Law (p.51)" },
    { q: "¬(¬P) ≡ ?", a: "P", hint: "Two negations cancel", law: "Double Negation (p.52)" },
    { q: "P ∧ (Q ∨ R) ≡ ?", a: "(P ∧ Q) ∨ (P ∧ R)", hint: "Distribute ∧ over ∨", law: "Distributive Law (p.52)" },
    { q: "P ∨ (Q ∧ R) ≡ ?", a: "(P ∨ Q) ∧ (P ∨ R)", hint: "Distribute ∨ over ∧", law: "Distributive Law (p.52)" },
    { q: "A ∪ B̄ = ?", a: "Ā ∩ B̄", hint: "De Morgan for sets: complement of union", law: "De Morgan for Sets (p.163)" },
    { q: "A ∩ B̄ = ?", a: "Ā ∪ B̄", hint: "De Morgan for sets: complement of intersection", law: "De Morgan for Sets (p.163)" },
    { q: "What is |𝒫(A)| when |A| = n?", a: "2ⁿ", hint: "Each element is either IN or OUT", law: "Power Set Theorem (p.15)" },
  ],
  "Page 2 — Sets & Operations": [
    { q: "A ∪ B = ?", a: "{x : x ∈ A or x ∈ B}", hint: "Union: everything in A, B, or both", law: "Definition 1.5 (p.18)" },
    { q: "A ∩ B = ?", a: "{x : x ∈ A and x ∈ B}", hint: "Intersection: only what's in both", law: "Definition 1.5 (p.18)" },
    { q: "A \\ B = ?", a: "{x : x ∈ A and x ∉ B}", hint: "Difference: in A but NOT in B", law: "Definition 1.5 (p.18)" },
    { q: "Ā = ? (complement)", a: "U \\ A = {x ∈ U : x ∉ A}", hint: "Everything in the universe NOT in A", law: "Definition 1.6 (p.20)" },
    { q: "Is ∅ ⊆ A always true?", a: "Yes — vacuously true for ALL sets A", hint: "No element of ∅ fails to be in A", law: "p.13" },
    { q: "A ∩ Ā = ?", a: "∅", hint: "A set and its complement share nothing", law: "p.20" },
    { q: "A ∪ Ā = ?", a: "U (the universal set)", hint: "Together they cover everything", law: "p.20" },
    { q: "A = B if and only if?", a: "A ⊆ B and B ⊆ A", hint: "Subset in both directions means equal", law: "p.13" },
    { q: "If |A| = m and |B| = n, then |A × B| = ?", a: "mn", hint: "m choices for a, n for b", law: "p.9" },
    { q: "A ∪ ∅ = ?", a: "A", hint: "Adding nothing changes nothing", law: "p.18" },
  ],
  "Page 3 — Logical Statements": [
    { q: "When is P ⟹ Q FALSE?", a: "Only when P is TRUE and Q is FALSE", hint: "All other rows are true!", law: "Truth table (p.42)" },
    { q: "Converse of P ⟹ Q?", a: "Q ⟹ P", hint: "Swap hypothesis and conclusion", law: "p.43" },
    { q: "Contrapositive of P ⟹ Q?", a: "¬Q ⟹ ¬P", hint: "Negate and flip — equivalent to original", law: "p.43" },
    { q: "Is the converse equivalent to P ⟹ Q?", a: "NO — converse is NOT equivalent", hint: "'If rains → umbrella' ≠ 'If umbrella → rains'", law: "p.51" },
    { q: "Is the contrapositive equivalent to P ⟹ Q?", a: "YES — always logically equivalent", hint: "Same truth table in every row", law: "p.51" },
    { q: "∀x ∈ S, P(x) means?", a: "For EVERY x in S, P(x) holds", hint: "Universal — must hold for all, no exceptions", law: "p.53" },
    { q: "∃x ∈ S, P(x) means?", a: "There EXISTS at least one x in S with P(x)", hint: "Existential — just one witness is enough", law: "p.54" },
    { q: "Is 'or' in math inclusive or exclusive?", a: "INCLUSIVE — P ∨ Q is true when one OR BOTH are true", hint: "Unlike everyday English 'either/or'", law: "p.40" },
    { q: "P ⟺ Q is true when?", a: "When P and Q have the SAME truth value", hint: "Both true, or both false", law: "p.46" },
    { q: "Open sentence vs. statement?", a: "Open sentence depends on a variable; statement is always T or F", hint: "'x > 0' is open; '5 > 0' is a statement", law: "p.35–36" },
  ],
  "Page 4 — Negations": [
    { q: "¬(P ⟹ Q) ≡ ?", a: "P ∧ ¬Q", hint: "Conditional fails only when hypothesis T and conclusion F", law: "p.59" },
    { q: "¬(∀x ∈ S, P(x)) ≡ ?", a: "∃x ∈ S, ¬P(x)", hint: "'Not all' means 'at least one fails'", law: "Eq. 2.8 (p.60)" },
    { q: "¬(∃x ∈ S, P(x)) ≡ ?", a: "∀x ∈ S, ¬P(x)", hint: "'None exists' means 'all fail'", law: "Eq. 2.9 (p.60)" },
    { q: "Negate: 'x is even and x > 0'", a: "'x is odd OR x ≤ 0'", hint: "Negate a conjunction: De Morgan — AND becomes OR", law: "p.60" },
    { q: "Negate: 'All primes are odd'", a: "'There exists a prime that is NOT odd' (e.g. 2)", hint: "Negate ∀: ∃ with negated predicate", law: "p.60" },
    { q: "¬(∀x, ∃y, P(x,y)) ≡ ?", a: "∃x, ∀y, ¬P(x,y)", hint: "Flip each quantifier, negate the predicate", law: "p.62" },
    { q: "Negate: P ∨ Q", a: "¬P ∧ ¬Q", hint: "De Morgan: OR becomes AND, negate each", law: "De Morgan #2 (p.51)" },
    { q: "Negate: P ∧ Q", a: "¬P ∨ ¬Q", hint: "De Morgan: AND becomes OR, negate each", law: "De Morgan #1 (p.51)" },
    { q: "Is ¬(P ⟹ Q) the same as ¬P ⟹ ¬Q?", a: "NO — ¬(P⟹Q) = P ∧ ¬Q, not ¬P⟹¬Q", hint: "Common mistake! The inverse ¬P⟹¬Q is NOT the negation", law: "p.59" },
    { q: "Negate: ∃x ∈ ℝ, x² = -1", a: "∀x ∈ ℝ, x² ≠ -1  (TRUE)", hint: "Negate ∃ → ∀, negate predicate", law: "p.60" },
  ],
  "Page 5 — Logical Equivalence": [
    { q: "Two statements are logically equivalent when?", a: "Their truth tables match in EVERY row", hint: "Not just sometimes — every case must agree", law: "p.50" },
    { q: "P ⟹ Q ≡ ¬P ∨ Q — true or false?", a: "TRUE — logically equivalent", hint: "Verify: P=T,Q=F gives F on both sides", law: "p.51" },
    { q: "Are P⟹Q and Q⟹P equivalent?", a: "NO — converse is not equivalent", hint: "P=T,Q=F: P⟹Q is F but Q⟹P is T", law: "p.51" },
    { q: "Simplify ¬(¬P ∨ Q)", a: "P ∧ ¬Q", hint: "De Morgan: ¬(¬P∨Q) = ¬(¬P)∧¬Q = P∧¬Q", law: "p.51" },
    { q: "Name the law: P∧Q ≡ Q∧P", a: "Commutative Law for ∧", hint: "Order doesn't matter for AND", law: "p.52" },
    { q: "Name the law: P∧(Q∧R) ≡ (P∧Q)∧R", a: "Associative Law for ∧", hint: "Grouping doesn't matter", law: "p.52" },
    { q: "How do you PROVE two statements are equivalent?", a: "Build a truth table and verify every row matches", hint: "Systematic: check all 2ⁿ combinations", law: "p.50" },
    { q: "¬(¬P) ≡ ?", a: "P", hint: "Two negatives make a positive", law: "Double Negation (p.52)" },
    { q: "P ⟺ Q ≡ ?", a: "(P ∧ Q) ∨ (¬P ∧ ¬Q)", hint: "True exactly when both match", law: "p.49" },
    { q: "P ∧ (Q ∨ R) ≡ ?", a: "(P ∧ Q) ∨ (P ∧ R)", hint: "Distributive law — ∧ distributes over ∨", law: "p.52" },
  ],
};

const MATCHING_PAIRS = [
  { prompt: "¬(P ∧ Q)", answer: "¬P ∨ ¬Q", category: "De Morgan #1" },
  { prompt: "¬(P ∨ Q)", answer: "¬P ∧ ¬Q", category: "De Morgan #2" },
  { prompt: "P ⟹ Q (contrapositive)", answer: "¬Q ⟹ ¬P", category: "Contrapositive Law" },
  { prompt: "P ⟹ Q (as disjunction)", answer: "¬P ∨ Q", category: "Implication Law" },
  { prompt: "¬(P ⟹ Q)", answer: "P ∧ ¬Q", category: "Negation of Conditional" },
  { prompt: "¬(∀x, P(x))", answer: "∃x, ¬P(x)", category: "Quantifier Negation" },
  { prompt: "¬(∃x, P(x))", answer: "∀x, ¬P(x)", category: "Quantifier Negation" },
  { prompt: "A ∪ B (complement)", answer: "Ā ∩ B̄", category: "De Morgan for Sets" },
  { prompt: "A ∩ B (complement)", answer: "Ā ∪ B̄", category: "De Morgan for Sets" },
  { prompt: "P ∧ (Q ∨ R)", answer: "(P ∧ Q) ∨ (P ∧ R)", category: "Distributive Law" },
  { prompt: "{x : x ∈ A or x ∈ B}", answer: "A ∪ B", category: "Union" },
  { prompt: "{x : x ∈ A and x ∈ B}", answer: "A ∩ B", category: "Intersection" },
  { prompt: "{x : x ∈ A and x ∉ B}", answer: "A \\ B", category: "Set Difference" },
  { prompt: "U \\ A", answer: "Ā", category: "Complement" },
  { prompt: "Set of all subsets of A", answer: "𝒫(A)", category: "Power Set" },
];

const PRACTICE_PROBLEMS = [
  { q: "Negate the statement: ∀x ∈ ℝ, x² ≥ 0",
    answer: "∃x ∈ ℝ, x² < 0",
    keywords: ["∃", "exists", "x²", "< 0", "negative"],
    partialHints: { "∀": "You kept ∀ — negating ∀ gives ∃! Flip it.", "x² > 0": "Almost — ≥ 0 negates to < 0.", "< 0": "Good negated predicate! Also flip ∀ to ∃." },
    hint: "Negating ∀ gives ∃, and negate the predicate: ≥ 0 becomes < 0",
    explanation: "¬(∀x ∈ ℝ, x² ≥ 0) = ∃x ∈ ℝ, ¬(x² ≥ 0) = ∃x ∈ ℝ, x² < 0" },
  { q: "Write the contrapositive of: 'If n² is even, then n is even'",
    answer: "If n is odd, then n² is odd",
    keywords: ["odd", "n is odd", "n² is odd", "contrapositive"],
    partialHints: { "even": "Remember the contrapositive negates both. Even becomes odd.", "n²": "Good — n² appears. But negate it: n² even becomes n² odd." },
    hint: "Contrapositive: flip and negate. 'If P then Q' becomes 'If ¬Q then ¬P'",
    explanation: "Original: (n² even) ⟹ (n even). Contrapositive: (n odd) ⟹ (n² odd)" },
  { q: "Let A = {1,2,3,4,5} and B = {3,4,5,6,7}. Find A ∩ B.",
    answer: "{3, 4, 5}",
    keywords: ["3", "4", "5"],
    partialHints: { "6": "6 is in B but NOT in A — intersection only keeps elements in BOTH.", "1": "1 is in A but NOT in B." },
    hint: "Intersection = elements that appear in BOTH A and B",
    explanation: "A ∩ B = {x : x ∈ A AND x ∈ B} = {3,4,5}" },
  { q: "Simplify ¬(P ⟹ Q) using logical equivalences.",
    answer: "P ∧ ¬Q",
    keywords: ["P ∧ ¬Q", "P and not Q", "P∧¬Q"],
    partialHints: { "¬P": "¬P appears in the inverse, not the negation. P stays positive.", "∨": "The negation of P⟹Q doesn't have an OR.", "¬Q": "You got ¬Q — now what about P? It stays positive." },
    hint: "P⟹Q fails exactly when P is true AND Q is false",
    explanation: "¬(P⟹Q) = ¬(¬P∨Q) = ¬(¬P)∧¬Q = P∧¬Q  by De Morgan + Double Negation" },
  { q: "Prove that A ∩ B ⊆ A for any sets A and B.",
    answer: "Let x ∈ A ∩ B. Then x ∈ A and x ∈ B. In particular, x ∈ A. Therefore A ∩ B ⊆ A.",
    keywords: ["let x", "x ∈ A", "x ∈ B", "therefore", "particular"],
    partialHints: { "assume": "Good instinct! Try 'Let x ∈ A ∩ B'", "x ∈ A ∩ B": "Great start! Now unpack the definition of intersection.", "definition": "Use Definition 1.5: x ∈ A∩B means x∈A AND x∈B." },
    hint: "Element-chasing proof: Let x ∈ A∩B, use definition of ∩, conclude x ∈ A",
    explanation: "Let x ∈ A∩B. By definition, x∈A and x∈B. In particular, x∈A. Therefore A∩B ⊆ A. □" },
  { q: "Is P ∧ Q logically equivalent to ¬(¬P ∨ ¬Q)? Justify.",
    answer: "Yes — by De Morgan: ¬(¬P ∨ ¬Q) = ¬(¬P) ∧ ¬(¬Q) = P ∧ Q",
    keywords: ["yes", "de morgan", "double negation", "P ∧ Q"],
    partialHints: { "no": "Actually yes — apply De Morgan's law to ¬(¬P ∨ ¬Q).", "truth table": "Truth table works! But try the faster route: De Morgan directly.", "de morgan": "Exactly! Apply De Morgan: ¬(¬P∨¬Q) = ¬(¬P)∧¬(¬Q). Now simplify." },
    hint: "Apply De Morgan to the outer negation, then use Double Negation twice",
    explanation: "¬(¬P∨¬Q) =^{DM} ¬(¬P)∧¬(¬Q) =^{DN} P∧Q  ✓" },
];

// ═══════════════════════════════════════════════════════════════
//  FEEDBACK ENGINE (unchanged)
// ═══════════════════════════════════════════════════════════════

function evaluateAnswer(userInput, problem) {
  const u = userInput.toLowerCase().trim();
  const a = problem.answer.toLowerCase();
  if (u === a || u.replace(/\s+/g, "") === a.replace(/\s+/g, "")) return { type: "correct", message: null };
  const matched = problem.keywords.filter(k => u.includes(k.toLowerCase()));
  const ratio = matched.length / problem.keywords.length;
  for (const [trigger, msg] of Object.entries(problem.partialHints || {})) {
    if (u.includes(trigger.toLowerCase())) return { type: "partial", message: msg };
  }
  if (ratio >= 0.6) return { type: "close", message: "Really close! You've got the right idea — just tighten up the notation." };
  if (ratio >= 0.3) return { type: "partial", message: "You're on the right track. Re-read the hint and try again." };
  return { type: "wrong", message: null };
}

const ENCOURAGEMENT = ["🎉 Nailed it! That's exactly right.","✅ Perfect — textbook answer.","🔥 Yes! That's the one.","💯 Correct!","⭐ Spot on!"];
const CLOSE_MSGS = ["🤏 So close! One more try?","💡 Really close! Check notation.","🔍 Nearly perfect — one small thing off."];
const WRONG_MSGS = ["Not quite — want a hint?","Hmm, that's not it. Want me to guide you?","Keep thinking — here's a nudge..."];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════
//  WOLFRAM PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════

function WolframPanel({ defaultQuery = "", onClose }) {
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!query.trim()) return;
    setLoading(true); setResult(null);
    const r = await wolframQuery(null, query);
    setResult(r);
    setLoading(false);
  }

  useEffect(() => {
    if (defaultQuery) run();
  }, [defaultQuery]);

  return (
    <div style={{ background: "#0e1322", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 12, padding: "1rem 1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ color: "#a855f7", fontFamily: "monospace", fontSize: "0.8rem", letterSpacing: "0.1em" }}>🔬 WOLFRAM ALPHA VERIFICATION</span>
        {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: "#7a8090", cursor: "pointer", fontSize: "1rem" }}>×</button>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Enter Wolfram query..."
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 8, padding: "0.5rem 0.75rem", color: "#e2e8f0", fontSize: "0.85rem", fontFamily: "monospace", outline: "none" }} />
        <button onClick={run} disabled={loading || !query.trim()}
          style={{ background: "#7c3aed", border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          {loading ? "..." : "Ask"}
        </button>
        <button onClick={() => openWolframTab(query)} title="Open in Wolfram Alpha"
          style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 8, padding: "0.5rem 0.6rem", color: "#a855f7", cursor: "pointer", fontSize: "0.85rem" }}>
          ↗
        </button>
      </div>
      {result && (
        <div style={{ background: result.error ? "rgba(248,113,113,0.08)" : "rgba(168,85,247,0.06)", border: `1px solid ${result.error ? "rgba(248,113,113,0.3)" : "rgba(168,85,247,0.2)"}`, borderRadius: 8, padding: "0.75rem 1rem" }}>
          {result.error
            ? <span style={{ color: "#f87171", fontSize: "0.85rem", fontFamily: "monospace" }}>⚠ {result.error}</span>
            : <span style={{ color: "#c4b5fd", fontSize: "0.9rem", fontFamily: "monospace" }}>✓ {result.result}</span>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  INTERACTIVE TRUTH TABLE WIDGET
// ═══════════════════════════════════════════════════════════════

function TruthTableWidget({ ex }) {
  const vars = ex.vars || ["P","Q"];
  const formula = ex.formula || ex.q;
  const bookRows = ex.rows || [];
  const n = vars.length;
  const combos = [];
  for (let i = 0; i < Math.pow(2, n); i++) {
    const row = [];
    for (let j = n - 1; j >= 0; j--) { row.unshift(((i >> j) & 1) ? "T" : "F"); }
    combos.push(row);
  }
  const [userVals, setUserVals] = useState(() => combos.map(() => "?"));
  const [checked, setChecked] = useState(false);
  const [showWolfram, setShowWolfram] = useState(false);

  function setVal(ri, v) {
    setUserVals(prev => { const n2 = [...prev]; n2[ri] = v; return n2; });
    setChecked(false);
  }

  const results = checked ? combos.map((_, ri) => {
    const expected = bookRows[ri]?.[bookRows[ri].length - 1] ?? "?";
    return userVals[ri] === expected;
  }) : [];
  const allCorrect = checked && results.every(Boolean);
  const score = checked ? results.filter(Boolean).length : 0;

  return (
    <div>
      <div style={{ color: "#c9a84c", fontSize: "0.8rem", fontFamily: "monospace", marginBottom: "0.75rem" }}>
        Fill in the result column for: <span style={{ color: "#f0e6c8" }}>{formula}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontFamily: "monospace", fontSize: "0.9rem", minWidth: "100%" }}>
          <thead>
            <tr>
              {vars.map(v => (
                <th key={v} style={{ padding: "0.5rem 1rem", background: "#1a1d2e", color: "#c9a84c", border: "1px solid #2d3748", textAlign: "center" }}>{v}</th>
              ))}
              <th style={{ padding: "0.5rem 1rem", background: "#1a1d2e", color: "#a855f7", border: "1px solid #2d3748", textAlign: "center" }}>
                {formula.split(" vs ")[0] || formula}
              </th>
              {formula.includes(" vs ") && (
                <th style={{ padding: "0.5rem 1rem", background: "#1a1d2e", color: "#4ade80", border: "1px solid #2d3748", textAlign: "center" }}>
                  {formula.split(" vs ")[1]}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {combos.map((combo, ri) => {
              const rowCorrect = checked ? results[ri] : null;
              const resultCols = bookRows[ri] ? bookRows[ri].slice(n) : [];
              return (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                  {combo.map((v, ci) => (
                    <td key={ci} style={{ padding: "0.5rem 1rem", border: "1px solid #2d3748", textAlign: "center", color: v === "T" ? "#86efac" : "#fca5a5" }}>{v}</td>
                  ))}
                  {/* First result col — user fills in */}
                  <td style={{ padding: "0.4rem 0.5rem", border: "1px solid #2d3748", textAlign: "center" }}>
                    {checked ? (
                      <span style={{ color: rowCorrect ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                        {userVals[ri]} {rowCorrect ? "✓" : `✗(${bookRows[ri]?.[n] || "?"})`}
                      </span>
                    ) : (
                      <select value={userVals[ri]} onChange={e => setVal(ri, e.target.value)}
                        style={{ background: "#1c2230", border: "1px solid #3b82f6", borderRadius: 6, color: "#f0e6c8", padding: "0.2rem 0.4rem", fontFamily: "monospace", cursor: "pointer" }}>
                        <option value="?">?</option>
                        <option value="T">T</option>
                        <option value="F">F</option>
                      </select>
                    )}
                  </td>
                  {/* Second col if equiv comparison */}
                  {resultCols.length > 1 && (
                    <td style={{ padding: "0.5rem 1rem", border: "1px solid #2d3748", textAlign: "center", color: resultCols[1] === "T" ? "#86efac" : "#fca5a5" }}>
                      {resultCols[1]}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
        <button onClick={() => setChecked(true)}
          style={{ background: "#2563eb", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
          ✅ Check Table
        </button>
        <button onClick={() => { setUserVals(combos.map(() => "?")); setChecked(false); }}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "0.5rem 1rem", color: "#94a3b8", cursor: "pointer", fontSize: "0.9rem" }}>
          Reset
        </button>
        <button onClick={() => setShowWolfram(w => !w)}
          style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 8, padding: "0.5rem 1rem", color: "#a855f7", cursor: "pointer", fontSize: "0.9rem" }}>
          🔬 Wolfram
        </button>
      </div>
      {checked && (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: 8, background: allCorrect ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${allCorrect ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
          <span style={{ color: allCorrect ? "#4ade80" : "#f87171", fontWeight: 600 }}>
            {allCorrect ? `✓ Perfect! All ${combos.length} rows correct.` : `${score}/${combos.length} rows correct — review the highlighted rows.`}
          </span>
        </div>
      )}
      {showWolfram && <WolframPanel defaultQuery={ex.wolfram || ""} onClose={() => setShowWolfram(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EXERCISE BROWSER MODE (v2 new mode)
// ═══════════════════════════════════════════════════════════════

function ExerciseBrowserMode({ onBack, progress, onRecord }) {
  const [selectedSec, setSelectedSec] = useState("1.1");
  const [selectedEx, setSelectedEx] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // null | {correct, msg}
  const [showHint, setShowHint] = useState(false);
  const [showWolfram, setShowWolfram] = useState(false);
  const [currentEx, setCurrentEx] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSecs, setExpandedSecs] = useState({ "1.1": true });
  const inputRef = useRef();

  function loadExercise(ex) {
    const remixed = ex._remixed ? ex : ex;
    setCurrentEx(remixed);
    setSelectedEx(ex.id);
    setAnswer("");
    setFeedback(null);
    setShowHint(false);
    setShowWolfram(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleRemix() {
    if (!currentEx) return;
    const r = remixExercise(currentEx);
    setCurrentEx(r);
    setAnswer("");
    setFeedback(null);
    setShowHint(false);
    setShowWolfram(false);
  }

  function handleRandom() {
    const unmastered = EXERCISES.filter(e => !progress[e.id]?.correct);
    const pool = unmastered.length > 0 ? unmastered : EXERCISES;
    const ex = randChoice(pool);
    setExpandedSecs(prev => ({ ...prev, [ex.sec]: true }));
    setSelectedSec(ex.sec);
    loadExercise(ex);
  }

  function handleSubmit() {
    if (!currentEx || !answer.trim()) return;
    const ua = answer.trim().toLowerCase().replace(/\s+/g, "");
    const ca = currentEx.ans.toLowerCase().replace(/\s+/g, "");
    const correct = ua === ca || ca.includes(ua) || ua.includes(ca.substring(0, Math.min(ca.length, 8)));
    setFeedback({ correct, msg: currentEx.ans });
    onRecord(currentEx.id, correct);
  }

  function handleReveal() {
    setFeedback({ correct: null, msg: currentEx.ans });
    setShowHint(true);
  }

  function navExercise(dir) {
    const idx = EXERCISES.findIndex(e => e.id === (currentEx?.id || ""));
    const next = EXERCISES[(idx + dir + EXERCISES.length) % EXERCISES.length];
    setExpandedSecs(prev => ({ ...prev, [next.sec]: true }));
    setSelectedSec(next.sec);
    loadExercise(next);
  }

  const secList = Object.keys(SECTIONS);
  const getProgress = (secKey, part) => {
    const exs = EXERCISE_BY_SECTION[secKey]?.[part] || [];
    const done = exs.filter(e => progress[e.id]?.correct).length;
    return { done, total: exs.length };
  };

  const pct = (d, t) => t === 0 ? 0 : Math.round(100 * d / t);
  const pctColor = p => p >= 80 ? "#4ade80" : p >= 40 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", fontFamily: "'Georgia', serif" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .ex-sidebar::-webkit-scrollbar { width: 4px; }
        .ex-sidebar::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 4px; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: "#161b22", borderBottom: "1px solid #2d3748", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>← Home</button>
        <span style={{ color: "#c9a84c", fontWeight: 600, fontSize: "0.95rem" }}>📐 Exercise Browser — §1.1 → §2.6</span>
        <div style={{ flex: 1 }} />
        <button onClick={handleRandom}
          style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "0.35rem 0.875rem", color: "#c9a84c", cursor: "pointer", fontSize: "0.8rem" }}>
          🔀 Random
        </button>
        <button onClick={() => setSidebarOpen(s => !s)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0.35rem 0.7rem", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}>
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="ex-sidebar" style={{ width: 270, background: "#161b22", borderRight: "1px solid #2d3748", overflowY: "auto", flexShrink: 0 }}>
            {secList.map(secKey => {
              const sec = SECTIONS[secKey];
              const open = expandedSecs[secKey];
              const allEx = Object.values(EXERCISE_BY_SECTION[secKey] || {}).flat();
              const done = allEx.filter(e => progress[e.id]?.correct).length;
              const p = pct(done, allEx.length);
              return (
                <div key={secKey}>
                  <div onClick={() => { setExpandedSecs(prev => ({ ...prev, [secKey]: !open })); setSelectedSec(secKey); }}
                    style={{ padding: "0.7rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", background: selectedSec === secKey ? "rgba(201,168,76,0.08)" : "transparent", borderLeft: selectedSec === secKey ? "2px solid #c9a84c" : "2px solid transparent" }}>
                    <span style={{ color: "#7a8090", fontSize: "0.75rem", fontFamily: "monospace", flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
                    <span style={{ color: "#c9a84c", fontSize: "0.75rem", fontFamily: "monospace", flexShrink: 0 }}>§{secKey}</span>
                    <span style={{ color: "#e2e8f0", fontSize: "0.8rem", flex: 1, lineHeight: 1.2 }}>{sec.title}</span>
                    <span style={{ color: pctColor(p), fontSize: "0.7rem", fontFamily: "monospace", flexShrink: 0 }}>{p}%</span>
                  </div>
                  {open && Object.entries(EXERCISE_BY_SECTION[secKey] || {}).map(([part, exs]) => {
                    const { done: pd, total: pt } = getProgress(secKey, part);
                    return (
                      <div key={part}>
                        <div style={{ padding: "0.3rem 1rem 0.3rem 2.25rem", color: "#7a8090", fontSize: "0.72rem", fontFamily: "monospace" }}>
                          Part {part} — {pd}/{pt}
                        </div>
                        {exs.map(ex => {
                          const done2 = progress[ex.id]?.correct;
                          const sel = selectedEx === ex.id;
                          return (
                            <div key={ex.id} onClick={() => { setSelectedSec(secKey); loadExercise(ex); }}
                              style={{ padding: "0.35rem 1rem 0.35rem 2.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", background: sel ? "rgba(59,130,246,0.15)" : "transparent", borderLeft: sel ? "2px solid #3b82f6" : "2px solid transparent" }}>
                              <span style={{ fontSize: "0.65rem", color: done2 ? "#4ade80" : "#4a5568" }}>{done2 ? "●" : "○"}</span>
                              <span style={{ color: sel ? "#93c5fd" : done2 ? "#86efac" : "#94a3b8", fontSize: "0.75rem", fontFamily: "monospace" }}>{ex.id.split(".").slice(-1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {!currentEx ? (
            <div style={{ textAlign: "center", paddingTop: "4rem", color: "#4a5568" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📐</div>
              <div style={{ color: "#7a8090", fontSize: "1rem" }}>Select an exercise from the sidebar, or click Random</div>
              <button onClick={handleRandom}
                style={{ marginTop: "1.5rem", background: "#c9a84c", color: "#0d0f1a", border: "none", borderRadius: 10, padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer", fontWeight: 700 }}>
                🔀 Start Random Exercise
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>

              {/* Exercise header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <span style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#c9a84c", fontSize: "0.75rem", fontFamily: "monospace" }}>
                  §{currentEx.sec} · {SECTIONS[currentEx.sec]?.title}
                </span>
                <span style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#93c5fd", fontSize: "0.75rem", fontFamily: "monospace" }}>
                  {currentEx.id}{currentEx._remixed ? " (remixed)" : ""}
                </span>
                <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#7a8090", fontSize: "0.72rem", fontFamily: "monospace" }}>
                  p.{SECTIONS[currentEx.sec]?.page}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => navExercise(-1)} style={{ background: "none", border: "1px solid #2d3748", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#7a8090", cursor: "pointer", fontSize: "0.8rem" }}>◀</button>
                <button onClick={() => navExercise(1)} style={{ background: "none", border: "1px solid #2d3748", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#7a8090", cursor: "pointer", fontSize: "0.8rem" }}>▶</button>
              </div>

              {/* Question */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.25rem" }}>
                <div style={{ color: "#7a8090", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.875rem", fontFamily: "monospace" }}>Question</div>
                <div style={{ color: "#f0e6c8", fontSize: "1.1rem", lineHeight: 1.7 }}>{currentEx.q}</div>
              </div>

              {/* Truth table or text input */}
              {currentEx.type === "truth_table" ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.25rem" }}>
                  <TruthTableWidget ex={currentEx} />
                </div>
              ) : (
                <>
                  <input ref={inputRef} value={answer}
                    onChange={e => { setAnswer(e.target.value); setFeedback(null); }}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="Type your answer and press Enter..."
                    disabled={feedback?.correct === true}
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: feedback ? `1px solid ${feedback.correct === true ? "rgba(74,222,128,0.5)" : feedback.correct === false ? "rgba(248,113,113,0.5)" : "rgba(148,163,184,0.4)"}` : "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "0.875rem 1rem", color: "#f0e6c8", fontSize: "1rem", fontFamily: "'Georgia', serif", outline: "none", marginBottom: "0.875rem", transition: "border-color 0.2s" }} />

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <button onClick={handleSubmit} disabled={!answer.trim() || feedback?.correct === true}
                      style={{ background: answer.trim() ? "#c9a84c" : "rgba(201,168,76,0.15)", color: answer.trim() ? "#0d0f1a" : "#6a5830", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", cursor: answer.trim() ? "pointer" : "default", fontWeight: 700, fontSize: "0.9rem" }}>
                      ✅ Submit
                    </button>
                    <button onClick={handleReveal}
                      style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 8, padding: "0.6rem 1rem", color: "#94a3b8", cursor: "pointer", fontSize: "0.9rem" }}>
                      👁 Reveal
                    </button>
                    <button onClick={handleRemix}
                      style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8, padding: "0.6rem 1rem", color: "#c9a84c", cursor: "pointer", fontSize: "0.9rem" }}>
                      🔀 Remix
                    </button>
                    <button onClick={() => setShowHint(h => !h)}
                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, padding: "0.6rem 1rem", color: "#93c5fd", cursor: "pointer", fontSize: "0.9rem" }}>
                      💡 Hint
                    </button>
                    <button onClick={() => setShowWolfram(w => !w)}
                      style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 8, padding: "0.6rem 1rem", color: "#a855f7", cursor: "pointer", fontSize: "0.9rem" }}>
                      🔬 Wolfram
                    </button>
                  </div>
                </>
              )}

              {/* Hint */}
              {showHint && (
                <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.875rem", animation: "fadeIn 0.2s" }}>
                  <span style={{ color: "#93c5fd", fontSize: "0.85rem" }}>💡 <em>{currentEx.hint}</em></span>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div style={{ background: feedback.correct === true ? "rgba(74,222,128,0.07)" : feedback.correct === false ? "rgba(248,113,113,0.07)" : "rgba(148,163,184,0.07)", border: `1px solid ${feedback.correct === true ? "rgba(74,222,128,0.3)" : feedback.correct === false ? "rgba(248,113,113,0.3)" : "rgba(148,163,184,0.3)"}`, borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "0.875rem", animation: "fadeIn 0.25s" }}>
                  <div style={{ color: feedback.correct === true ? "#4ade80" : feedback.correct === false ? "#f87171" : "#94a3b8", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.95rem" }}>
                    {feedback.correct === true ? "✅ Correct!" : feedback.correct === false ? "❌ Not quite." : "📖 Book Answer"}
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "monospace", lineHeight: 1.6 }}>{feedback.msg}</div>
                </div>
              )}

              {/* Wolfram panel */}
              {showWolfram && <WolframPanel defaultQuery={currentEx.wolfram || currentEx.q.slice(0,80)} onClose={() => setShowWolfram(false)} />}

              {/* Definitions panel */}
              <details style={{ marginTop: "1.5rem" }}>
                <summary style={{ color: "#7a8090", cursor: "pointer", fontSize: "0.85rem", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                  📖 §{currentEx.sec} Key Definitions
                </summary>
                <div style={{ marginTop: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid #2d3748", borderRadius: 10, padding: "1rem" }}>
                  {Object.entries(SECTIONS[currentEx.sec]?.defs || {}).map(([k,v]) => (
                    <div key={k} style={{ marginBottom: "0.6rem" }}>
                      <span style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: "0.85rem" }}>{k}: </span>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS / WOLFRAM APPID MODAL
// ═══════════════════════════════════════════════════════════════

function SettingsModal({ onClose }) {
  const [wolframStatus, setWolframStatus] = useState(null); // null | 'ok' | 'error'
  const [testing, setTesting] = useState(false);

  async function testWolfram() {
    setTesting(true); setWolframStatus(null);
    const r = await wolframQuery(null, "2 + 2");
    setWolframStatus(r?.result ? "ok" : "error");
    setTesting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#161b22", border: "1px solid #2d3748", borderRadius: 16, padding: "2rem", maxWidth: 480, width: "90%" }}>
        <h3 style={{ color: "#f0e6c8", margin: "0 0 0.5rem", fontSize: "1.2rem" }}>⚙ Settings</h3>

        {/* Wolfram status */}
        <div style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ color: "#a855f7", fontSize: "0.8rem", fontFamily: "monospace", marginBottom: "0.5rem" }}>🔬 WOLFRAM ALPHA</div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "0.875rem" }}>
            Wolfram verification runs server-side via the <code style={{ color: "#c4b5fd" }}>/api/wolfram</code> proxy.<br/>
            Your AppID is set as <code style={{ color: "#c4b5fd" }}>WOLFRAM_APP_ID</code> in Vercel environment variables — never exposed to browsers.
          </div>
          <button onClick={testWolfram} disabled={testing}
            style={{ background: testing ? "rgba(168,85,247,0.1)" : "#7c3aed", border: "none", borderRadius: 8, padding: "0.5rem 1rem", color: "white", cursor: testing ? "default" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
            {testing ? "Testing..." : "🧪 Test Connection"}
          </button>
          {wolframStatus === "ok" && <span style={{ marginLeft: "0.75rem", color: "#4ade80", fontSize: "0.85rem" }}>✓ Connected! (2 + 2 = 4)</span>}
          {wolframStatus === "error" && <span style={{ marginLeft: "0.75rem", color: "#f87171", fontSize: "0.85rem" }}>✗ Not working — check WOLFRAM_APP_ID in Vercel</span>}
        </div>

        {/* Wolfram setup reminder */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2d3748", borderRadius: 8, padding: "0.875rem", marginBottom: "1.25rem", fontSize: "0.8rem", color: "#7a8090", lineHeight: 1.6 }}>
          <strong style={{ color: "#94a3b8" }}>To configure Wolfram:</strong><br/>
          1. Get a free AppID at <a href="https://developer.wolframalpha.com/" target="_blank" rel="noreferrer" style={{ color: "#a855f7" }}>developer.wolframalpha.com</a><br/>
          2. In Vercel → Your Project → Settings → Environment Variables<br/>
          3. Add: <code style={{ color: "#c4b5fd" }}>WOLFRAM_APP_ID</code> = your AppID<br/>
          4. Redeploy (Vercel does this automatically)
        </div>

        <button onClick={onClose}
          style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "0.75rem", color: "#f0e6c8", cursor: "pointer", fontSize: "0.95rem" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PROGRESS VIEW
// ═══════════════════════════════════════════════════════════════

function ProgressView({ progress, onBack }) {
  const total = EXERCISES.length;
  const done = EXERCISES.filter(e => progress[e.id]?.correct).length;
  const overall = Math.round(100 * done / total);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", padding: "2rem", fontFamily: "'Georgia', serif", overflowY: "auto" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Home</button>
          <h2 style={{ color: "#f0e6c8", margin: 0 }}>📊 Progress Report</h2>
        </div>

        {/* Overall */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2d3748", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ color: "#c9a84c", fontSize: "3.5rem", fontWeight: 700, lineHeight: 1 }}>{overall}%</div>
          <div style={{ color: "#7a8090", fontSize: "0.9rem", marginTop: "0.25rem" }}>Overall Mastery — {done}/{total} exercises</div>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 8, marginTop: "1rem", overflow: "hidden" }}>
            <div style={{ background: "#c9a84c", height: "100%", width: overall + "%", borderRadius: 4, transition: "width 1s" }} />
          </div>
        </div>

        {/* Per section */}
        {Object.keys(SECTIONS).map(secKey => {
          const sec = SECTIONS[secKey];
          const exs = Object.values(EXERCISE_BY_SECTION[secKey] || {}).flat();
          const sd = exs.filter(e => progress[e.id]?.correct).length;
          const sp = exs.length === 0 ? 0 : Math.round(100 * sd / exs.length);
          const color = sp >= 80 ? "#4ade80" : sp >= 40 ? "#fbbf24" : "#f87171";
          const low = exs.filter(e => !progress[e.id]?.correct).slice(0, 4);
          return (
            <div key={secKey} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2d3748", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: "0.8rem", flexShrink: 0 }}>§{secKey}</span>
                <span style={{ color: "#f0e6c8", fontSize: "0.9rem", flex: 1 }}>{sec.title}</span>
                <span style={{ color, fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600 }}>{sd}/{exs.length}  ({sp}%)</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                <div style={{ background: color, height: "100%", width: sp + "%", borderRadius: 3 }} />
              </div>
              {low.length > 0 && (
                <div style={{ color: "#f87171", fontSize: "0.72rem", fontFamily: "monospace", marginTop: "0.4rem" }}>
                  ⚠ Not yet mastered: {low.map(e => e.id.split(".").slice(-1)[0]).join(", ")}
                  {exs.filter(e => !progress[e.id]?.correct).length > 4 ? ` +${exs.filter(e => !progress[e.id]?.correct).length - 4} more` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HOME SCREEN (enhanced)
// ═══════════════════════════════════════════════════════════════

function HomeScreen({ onSelect, progress, onSettings }) {
  const total = EXERCISES.length;
  const done = EXERCISES.filter(e => progress[e.id]?.correct).length;
  const overall = Math.round(100 * done / total);

  const modes = [
    { id: "exercises", icon: "📐", label: "Exercise Browser", desc: "All §1.1–§2.6 problems with Wolfram verification", accent: "#c9a84c", new: true },
    { id: "flashcards", icon: "🃏", label: "Flashcards", desc: "Flip through every concept with smart feedback", accent: "#3b82f6" },
    { id: "matching", icon: "🔗", label: "Matching Game", desc: "Word bank — drag concepts to their definitions", accent: "#a855f7" },
    { id: "practice", icon: "✏️", label: "Practice Problems", desc: "Guided answers — I'll coach you if you're wrong", accent: "#22c55e" },
    { id: "rapid", icon: "⚡", label: "Rapid Fire", desc: "20 questions, clock is ticking", accent: "#ef4444" },
    { id: "progress", icon: "📊", label: "Progress", desc: `Mastery: ${overall}% (${done}/${total} exercises)`, accent: "#fb923c" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Georgia', serif" }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.8} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {[...Array(60)].map((_, i) => (
          <div key={i} style={{ position: "absolute", width: Math.random()*2+1+"px", height: Math.random()*2+1+"px", background: "white", borderRadius: "50%", top: Math.random()*100+"%", left: Math.random()*100+"%", opacity: Math.random()*0.6+0.1, animation: `twinkle ${Math.random()*3+2}s ease-in-out infinite`, animationDelay: Math.random()*3+"s" }} />
        ))}
      </div>

      {/* Settings button */}
      <button onClick={onSettings}
        style={{ position: "fixed", top: "1.25rem", right: "1.25rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0.4rem 0.875rem", color: "#94a3b8", cursor: "pointer", fontSize: "0.85rem", zIndex: 10 }}>
        ⚙ Settings
      </button>

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 740, animation: "slideUp 0.5s ease" }}>
        <div style={{ marginBottom: "0.5rem", color: "#c9a84c", fontSize: "0.8rem", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "monospace" }}>
          MAT3013 · Book of Proof · Hammack Ed. 3.3
        </div>
        <h1 style={{ fontSize: "clamp(2.5rem,6vw,4rem)", color: "#f0e6c8", margin: "0 0 0.25rem", fontWeight: 400, lineHeight: 1.1 }}>
          Proof<span style={{ color: "#c9a84c" }}>Master</span> <span style={{ color: "#a855f7", fontSize: "0.55em" }}>Pro v2</span>
        </h1>
        <div style={{ color: "#7a8090", fontSize: "0.95rem", marginBottom: "1.5rem", fontFamily: "monospace" }}>
          Exam 1 Study Suite — Logic · Sets · Negations · Equivalence
        </div>

        {/* Mastery bar */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2d3748", borderRadius: 10, padding: "0.875rem 1.25rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#7a8090", fontSize: "0.8rem", fontFamily: "monospace", flexShrink: 0 }}>MASTERY</span>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ background: overall >= 80 ? "#4ade80" : overall >= 40 ? "#fbbf24" : "#c9a84c", height: "100%", width: overall + "%", borderRadius: 4, transition: "width 1.2s ease" }} />
          </div>
          <span style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>{overall}% ({done}/{total})</span>
        </div>

        {/* Section tags */}
        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
          {Object.keys(SECTIONS).map(k => (
            <span key={k} style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 6, padding: "0.2rem 0.6rem", color: "#c9a84c", fontSize: "0.7rem", fontFamily: "monospace" }}>§{k}</span>
          ))}
        </div>

        {/* Mode grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem" }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => onSelect(m.id)}
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.accent}25`, borderRadius: 14, padding: "1.35rem 1.1rem", cursor: "pointer", textAlign: "left", transition: "all 0.2s", position: "relative" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${m.accent}12`; e.currentTarget.style.borderColor = `${m.accent}60`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = `${m.accent}25`; e.currentTarget.style.transform = "none"; }}>
              {m.new && <span style={{ position: "absolute", top: "0.6rem", right: "0.6rem", background: "#a855f7", color: "white", fontSize: "0.55rem", padding: "0.1rem 0.4rem", borderRadius: 4, fontWeight: 700 }}>NEW</span>}
              <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{m.icon}</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#f0e6c8", marginBottom: "0.25rem" }}>{m.label}</div>
              <div style={{ fontSize: "0.75rem", color: "#7a8090", lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "2rem", color: "#3a4050", fontSize: "0.75rem", fontFamily: "monospace" }}>
          Product by Gavino Vara ©2026 · Richard Hammack, Book of Proof Ed. 3.3
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FLASHCARD MODE (original — preserved fully)
// ═══════════════════════════════════════════════════════════════

function FlashcardMode({ onBack }) {
  const deckNames = Object.keys(FLASHCARD_DECKS);
  const [deckIdx, setDeckIdx] = useState(0);
  const [cards, setCards] = useState(() => shuffle(FLASHCARD_DECKS[deckNames[0]]));
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [review, setReview] = useState(new Set());
  const [done, setDone] = useState(false);
  const [swipeDir, setSwipeDir] = useState(null);
  const card = cards[cardIdx];
  const progress = (cardIdx / cards.length) * 100;

  function changeDeck(idx) { setDeckIdx(idx); setCards(shuffle(FLASHCARD_DECKS[deckNames[idx]])); setCardIdx(0); setFlipped(false); setKnown(new Set()); setReview(new Set()); setDone(false); }
  function advance(dir) { setSwipeDir(dir); setTimeout(() => { setSwipeDir(null); setFlipped(false); if (cardIdx + 1 >= cards.length) setDone(true); else setCardIdx(i => i + 1); }, 300); }
  function markKnown() { setKnown(s => new Set([...s, cardIdx])); advance("right"); }
  function markReview() { setReview(s => new Set([...s, cardIdx])); advance("left"); }
  function restart() { setCards(shuffle(cards)); setCardIdx(0); setFlipped(false); setKnown(new Set()); setReview(new Set()); setDone(false); }

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎓</div>
        <h2 style={{ color: "#f0e6c8", fontSize: "1.8rem", marginBottom: "1rem" }}>Deck Complete!</h2>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", color: "#4ade80", fontWeight: 700 }}>{known.size}</div><div style={{ color: "#7a8090", fontSize: "0.8rem" }}>Got It</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", color: "#f87171", fontWeight: 700 }}>{review.size}</div><div style={{ color: "#7a8090", fontSize: "0.8rem" }}>Review Again</div></div>
        </div>
        {review.size > 0 && <button onClick={() => { setCards(shuffle(cards.filter((_, i) => review.has(i)))); setCardIdx(0); setFlipped(false); setKnown(new Set()); setReview(new Set()); setDone(false); }} style={{ background: "#c9a84c", color: "#0d0f1a", border: "none", borderRadius: 8, padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: "pointer", marginRight: "1rem", fontWeight: 700 }}>Drill Missed Cards</button>}
        <button onClick={restart} style={{ background: "rgba(255,255,255,0.08)", color: "#f0e6c8", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: "pointer" }}>Restart Deck</button>
        <br /><br />
        <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'Georgia', serif" }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Home</button>
          <select value={deckIdx} onChange={e => changeDeck(Number(e.target.value))} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, color: "#c9a84c", padding: "0.4rem 0.75rem", fontSize: "0.8rem", cursor: "pointer", fontFamily: "monospace" }}>
            {deckNames.map((n, i) => <option key={i} value={i} style={{ background: "#1a1d2e" }}>{n}</option>)}
          </select>
          <div style={{ color: "#7a8090", fontSize: "0.85rem", fontFamily: "monospace" }}>{cardIdx + 1} / {cards.length}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 4, marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ background: "#c9a84c", height: "100%", width: progress + "%", transition: "width 0.4s" }} />
        </div>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "0.25rem 0.75rem", color: "#c9a84c", fontSize: "0.75rem", fontFamily: "monospace" }}>{card.law}</span>
        </div>
        <div onClick={() => setFlipped(f => !f)} style={{ perspective: 1200, cursor: "pointer", userSelect: "none", transform: swipeDir === "right" ? "translateX(120%) rotate(15deg)" : swipeDir === "left" ? "translateX(-120%) rotate(-15deg)" : "none", transition: "transform 0.3s ease" }}>
          <div style={{ position: "relative", height: 280, transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "linear-gradient(135deg, #1a1d2e, #151825)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ color: "#7a8090", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem", fontFamily: "monospace" }}>QUESTION</div>
              <div style={{ color: "#f0e6c8", fontSize: "clamp(1.1rem,2.5vw,1.5rem)", textAlign: "center", lineHeight: 1.5 }}>{card.q}</div>
              <div style={{ marginTop: "2rem", color: "#4a5060", fontSize: "0.8rem", fontFamily: "monospace" }}>tap to reveal</div>
            </div>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "linear-gradient(135deg, #1a2430, #151e2a)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", transform: "rotateY(180deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ color: "#4ade80", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem", fontFamily: "monospace" }}>ANSWER</div>
              <div style={{ color: "#f0e6c8", fontSize: "clamp(1.1rem,2.5vw,1.4rem)", textAlign: "center", lineHeight: 1.6, marginBottom: "1rem" }}>{card.a}</div>
              <div style={{ background: "rgba(74,222,128,0.08)", borderRadius: 8, padding: "0.5rem 1rem", color: "#86efac", fontSize: "0.8rem", textAlign: "center", fontStyle: "italic" }}>💡 {card.hint}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
          <button onClick={markReview} style={{ flex: 1, maxWidth: 200, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "0.875rem", color: "#fca5a5", cursor: "pointer", fontSize: "0.9rem" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.22)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.12)"}>← Review Again</button>
          <button onClick={markKnown} style={{ flex: 1, maxWidth: 200, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 10, padding: "0.875rem", color: "#86efac", cursor: "pointer", fontSize: "0.9rem" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.22)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.12)"}>Got It →</button>
        </div>
        <div style={{ textAlign: "center", marginTop: "0.75rem", color: "#4a5060", fontSize: "0.75rem" }}>tap card to flip</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MATCHING MODE (original — preserved fully)
// ═══════════════════════════════════════════════════════════════

function MatchingMode({ onBack }) {
  const [pairs] = useState(() => shuffle(MATCHING_PAIRS).slice(0, 10));
  const [prompts] = useState(() => shuffle(pairs.map(p => p.prompt)));
  const [bank, setBank] = useState(() => shuffle(pairs.map(p => p.answer)));
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState({});
  const [wrong, setWrong] = useState(null);
  const [score, setScore] = useState(0);
  const [shakePrompt, setShakePrompt] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState(0);

  function selectPrompt(prompt) { if (matches[prompt]) return; setSelected(prompt); setWrong(null); }
  function selectAnswer(answer) {
    if (!selected || !bank.includes(answer)) return;
    const correctPair = pairs.find(p => p.prompt === selected);
    if (correctPair.answer === answer) {
      setMatches(m => ({ ...m, [selected]: answer }));
      setBank(b => b.filter(a => a !== answer));
      setScore(s => s + 1);
      setCelebrate(selected);
      setTimeout(() => setCelebrate(null), 1000);
      setSelected(null);
      if (score + 1 >= pairs.length) setTimeout(() => setDone(true), 600);
    } else {
      setErrors(e => e + 1); setWrong(answer); setShakePrompt(selected);
      setTimeout(() => { setWrong(null); setShakePrompt(null); }, 600);
    }
  }
  const accuracy = pairs.length > 0 ? Math.round((pairs.length / Math.max(pairs.length + errors, 1)) * 100) : 100;

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: "2rem" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{accuracy >= 90 ? "🏆" : accuracy >= 70 ? "⭐" : "📚"}</div>
        <h2 style={{ color: "#f0e6c8", fontSize: "2rem", marginBottom: "0.5rem" }}>Matching Complete!</h2>
        <div style={{ color: "#c9a84c", fontSize: "3rem", fontWeight: 700, marginBottom: "0.25rem" }}>{accuracy}%</div>
        <div style={{ color: "#7a8090", marginBottom: "2rem" }}>{score} correct · {errors} wrong</div>
        <button onClick={() => window.location.reload()} style={{ background: "#c9a84c", color: "#0d0f1a", border: "none", borderRadius: 8, padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer", fontWeight: 700, marginRight: "1rem" }}>Play Again</button>
        <button onClick={onBack} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#f0e6c8", borderRadius: 8, padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}>← Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", padding: "1.5rem", fontFamily: "'Georgia', serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}} @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}} @keyframes fadeMatch{0%{opacity:0;transform:scale(0.9)}100%{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ maxWidth: 900, margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Home</button>
        <div style={{ color: "#f0e6c8", fontWeight: 600 }}>🔗 Matching Game</div>
        <div style={{ fontFamily: "monospace", color: "#c9a84c" }}>{score}/{pairs.length}</div>
      </div>
      {selected && <div style={{ textAlign: "center", marginBottom: "1rem", color: "#c9a84c", fontFamily: "monospace", fontSize: "0.85rem" }}>Selected: "{selected}" — now click the matching definition →</div>}
      {!selected && score < pairs.length && <div style={{ textAlign: "center", marginBottom: "1rem", color: "#7a8090", fontSize: "0.85rem", fontFamily: "monospace" }}>Click a PROMPT on the left, then its ANSWER from the word bank on the right</div>}
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div>
          <div style={{ color: "#7a8090", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem", fontFamily: "monospace" }}>Prompts</div>
          {prompts.map((prompt, i) => {
            const isMatched = !!matches[prompt], isSel = selected === prompt, isShake = shakePrompt === prompt, isCeleb = celebrate === prompt;
            return (
              <div key={i} onClick={() => !isMatched && selectPrompt(prompt)} style={{ marginBottom: "0.6rem", padding: "0.875rem 1rem", borderRadius: 10, border: isMatched ? "1px solid rgba(74,222,128,0.4)" : isSel ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.1)", background: isMatched ? "rgba(74,222,128,0.08)" : isSel ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)", cursor: isMatched ? "default" : "pointer", color: isMatched ? "#86efac" : isSel ? "#f0e6c8" : "#aab0c0", fontSize: "0.9rem", transition: "all 0.2s", animation: isShake ? "shake 0.4s" : isCeleb ? "pop 0.4s" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{prompt}</span>
                {isMatched && <span>✓</span>}
                {isSel && !isMatched && <span style={{ color: "#c9a84c", fontSize: "0.75rem" }}>selected</span>}
              </div>
            );
          })}
        </div>
        <div>
          <div style={{ color: "#7a8090", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem", fontFamily: "monospace" }}>Word Bank</div>
          {bank.map((answer, i) => {
            const isWrong = wrong === answer;
            return (
              <div key={i} onClick={() => selectAnswer(answer)} style={{ marginBottom: "0.6rem", padding: "0.875rem 1rem", borderRadius: 10, border: isWrong ? "1px solid rgba(248,113,113,0.6)" : selected ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(255,255,255,0.1)", background: isWrong ? "rgba(248,113,113,0.1)" : selected ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.03)", cursor: selected ? "pointer" : "default", color: isWrong ? "#fca5a5" : selected ? "#f0e6c8" : "#7a8090", fontSize: "0.9rem", animation: isWrong ? "shake 0.4s" : "none", transition: "all 0.15s" }}
                onMouseEnter={e => { if (selected && !isWrong) e.currentTarget.style.background = "rgba(201,168,76,0.14)"; }}
                onMouseLeave={e => { if (selected && !isWrong) e.currentTarget.style.background = "rgba(201,168,76,0.06)"; }}>
                {answer}
              </div>
            );
          })}
          {Object.values(matches).map((ans, i) => (
            <div key={"m"+i} style={{ marginBottom: "0.6rem", padding: "0.875rem 1rem", borderRadius: 10, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.04)", color: "#4a6050", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", animation: "fadeMatch 0.4s" }}>
              <span>✓</span><span style={{ textDecoration: "line-through" }}>{ans}</span>
            </div>
          ))}
        </div>
      </div>
      {wrong && <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#1e1020", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 12, padding: "1rem 1.5rem", color: "#fca5a5", zIndex: 100, textAlign: "center" }}>✗ Not quite — that answer belongs somewhere else. Keep looking!</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PRACTICE MODE (original — preserved fully)
// ═══════════════════════════════════════════════════════════════

function PracticeMode({ onBack }) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef();
  const problem = PRACTICE_PROBLEMS[idx];

  function submit() {
    if (!input.trim()) return;
    const result = evaluateAnswer(input, problem);
    setAttempts(a => a + 1);
    if (result.type === "correct") { setState("correct"); setFeedback(pick(ENCOURAGEMENT)); setScore(s => s + 1); }
    else if (result.type === "close") { setState("close"); setFeedback(pick(CLOSE_MSGS) + (result.message ? " " + result.message : "")); }
    else if (result.type === "partial") { setState("partial"); setFeedback(result.message || "You've got part of it."); }
    else { setState("wrong"); setFeedback(pick(WRONG_MSGS)); setShowHint(true); }
  }
  function next() {
    if (idx + 1 >= PRACTICE_PROBLEMS.length) { setDone(true); return; }
    setIdx(i => i + 1); setInput(""); setState("idle"); setFeedback(""); setAttempts(0); setShowHint(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }
  function reveal() { setState("revealed"); setShowHint(true); }

  const stateColors = { correct: "#4ade80", close: "#fbbf24", partial: "#fb923c", wrong: "#f87171", revealed: "#94a3b8" };
  const stateBg = { correct: "rgba(74,222,128,0.08)", close: "rgba(251,191,36,0.08)", partial: "rgba(251,146,60,0.08)", wrong: "rgba(248,113,113,0.08)", revealed: "rgba(148,163,184,0.08)" };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{score >= 4 ? "🏆" : score >= 2 ? "⭐" : "📚"}</div>
        <h2 style={{ color: "#f0e6c8", fontSize: "2rem" }}>Practice Complete!</h2>
        <div style={{ color: "#c9a84c", fontSize: "3rem", fontWeight: 700 }}>{score}/{PRACTICE_PROBLEMS.length}</div>
        <div style={{ color: "#7a8090", marginBottom: "2rem" }}>problems solved correctly on first try</div>
        <button onClick={onBack} style={{ background: "#c9a84c", color: "#0d0f1a", border: "none", borderRadius: 8, padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer", fontWeight: 700 }}>← Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'Georgia', serif" }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width: "100%", maxWidth: 660 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Home</button>
          <div style={{ color: "#f0e6c8", fontWeight: 600 }}>✏️ Practice</div>
          <div style={{ fontFamily: "monospace", color: "#c9a84c" }}>{idx + 1}/{PRACTICE_PROBLEMS.length}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 4, marginBottom: "2rem" }}>
          <div style={{ background: "#c9a84c", height: "100%", width: (idx / PRACTICE_PROBLEMS.length * 100) + "%", transition: "width 0.4s", borderRadius: 4 }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.75rem", marginBottom: "1.25rem" }}>
          <div style={{ color: "#c9a84c", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem", fontFamily: "monospace" }}>Problem {idx + 1}</div>
          <div style={{ color: "#f0e6c8", fontSize: "1.15rem", lineHeight: 1.6 }}>{problem.q}</div>
        </div>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) submit(); }} disabled={state === "correct" || state === "revealed"} placeholder="Write your answer here... (Ctrl+Enter to submit)"
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: state !== "idle" ? `1px solid ${stateColors[state]}40` : "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "1rem 1.1rem", color: "#f0e6c8", fontSize: "0.95rem", lineHeight: 1.6, fontFamily: "'Georgia', serif", resize: "vertical", minHeight: 90, outline: "none", marginBottom: "1rem", transition: "border-color 0.3s" }} />
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {state !== "correct" && state !== "revealed" && <button onClick={submit} disabled={!input.trim()} style={{ flex: 1, background: input.trim() ? "#c9a84c" : "rgba(201,168,76,0.2)", color: input.trim() ? "#0d0f1a" : "#6a5830", border: "none", borderRadius: 10, padding: "0.875rem", fontSize: "1rem", cursor: input.trim() ? "pointer" : "default", fontWeight: 700 }}>Submit Answer</button>}
          {attempts >= 2 && state !== "correct" && state !== "revealed" && <button onClick={reveal} style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8", borderRadius: 10, padding: "0.875rem 1.25rem", fontSize: "0.9rem", cursor: "pointer" }}>Show Answer</button>}
          {(state === "correct" || state === "revealed") && <button onClick={next} style={{ flex: 1, background: state === "correct" ? "rgba(74,222,128,0.15)" : "rgba(201,168,76,0.15)", border: `1px solid ${state === "correct" ? "rgba(74,222,128,0.4)" : "rgba(201,168,76,0.4)"}`, color: state === "correct" ? "#86efac" : "#c9a84c", borderRadius: 10, padding: "0.875rem", fontSize: "1rem", cursor: "pointer" }}>Next Problem →</button>}
        </div>
        {state !== "idle" && (
          <div style={{ background: stateBg[state] || "rgba(255,255,255,0.04)", border: `1px solid ${stateColors[state]}40`, borderRadius: 12, padding: "1rem 1.25rem", animation: "slideUp 0.3s ease", marginBottom: "1rem" }}>
            <div style={{ color: stateColors[state], fontSize: "0.95rem", marginBottom: (state === "correct" || state === "revealed") ? "0.75rem" : 0, lineHeight: 1.5 }}>{feedback}{state === "wrong" && !feedback && pick(WRONG_MSGS)}</div>
            {showHint && state !== "correct" && <div style={{ color: "#aab0c0", fontSize: "0.85rem", borderTop: `1px solid ${stateColors[state]}25`, paddingTop: "0.75rem", lineHeight: 1.6 }}><span style={{ color: "#c9a84c" }}>💡 Hint: </span>{problem.hint}</div>}
            {(state === "correct" || state === "revealed") && <div style={{ color: "#86efac", fontSize: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem", lineHeight: 1.6, fontFamily: "monospace" }}><div style={{ color: "#7a8090", marginBottom: "0.25rem", fontFamily: "'Georgia', serif" }}>Full solution:</div>{problem.explanation}</div>}
          </div>
        )}
        {state === "idle" && attempts === 0 && <button onClick={() => setShowHint(h => !h)} style={{ background: "none", border: "none", color: "#5a6070", cursor: "pointer", fontSize: "0.8rem", fontFamily: "monospace" }}>{showHint ? "▾ hide hint" : "▸ show hint"}</button>}
        {showHint && state === "idle" && <div style={{ color: "#7a8090", fontSize: "0.85rem", fontStyle: "italic", marginTop: "0.5rem" }}>💡 {problem.hint}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RAPID FIRE MODE (original — preserved fully)
// ═══════════════════════════════════════════════════════════════

function RapidFireMode({ onBack }) {
  const ALL_CARDS = Object.values(FLASHCARD_DECKS).flat();
  const [questions] = useState(() => shuffle(ALL_CARDS).slice(0, 20));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(true);
  const inputRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, timerActive]);

  function handleTimeout() { setResults(r => [...r, { q: questions[idx].q, a: questions[idx].a, given: "(timed out)", correct: false }]); setState("timeout"); }
  function submit() {
    clearInterval(timerRef.current);
    const q = questions[idx], u = input.trim().toLowerCase();
    const correct = q.a.toLowerCase().includes(u) || u.includes(q.a.toLowerCase().substring(0, Math.floor(q.a.length * 0.7)));
    setResults(r => [...r, { q: q.q, a: q.a, given: input, correct }]);
    setState(correct ? "correct" : "wrong");
  }
  function next() {
    if (idx + 1 >= questions.length) { setTimerActive(false); setState("done"); return; }
    setIdx(i => i + 1); setInput(""); setState("idle"); setTimeLeft(30);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (state === "done") {
    const correct = results.filter(r => r.correct).length;
    return (
      <div style={{ minHeight: "100vh", background: "#0d0f1a", padding: "2rem", fontFamily: "'Georgia', serif", overflowY: "auto" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "3rem" }}>{correct >= 16 ? "🏆" : correct >= 10 ? "⭐" : "📚"}</div>
            <h2 style={{ color: "#f0e6c8", fontSize: "2rem" }}>Rapid Fire Complete!</h2>
            <div style={{ color: "#c9a84c", fontSize: "3.5rem", fontWeight: 700 }}>{correct}/20</div>
            <div style={{ color: "#7a8090" }}>{Math.round(correct / 20 * 100)}% accuracy</div>
          </div>
          <div style={{ marginBottom: "2rem" }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.6rem", padding: "0.75rem", background: r.correct ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)", border: `1px solid ${r.correct ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: 8 }}>
                <span style={{ color: r.correct ? "#4ade80" : "#f87171" }}>{r.correct ? "✓" : "✗"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#aab0c0", fontSize: "0.85rem" }}>{r.q}</div>
                  <div style={{ color: r.correct ? "#86efac" : "#fca5a5", fontSize: "0.8rem", fontFamily: "monospace" }}>{r.a}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onBack} style={{ width: "100%", background: "#c9a84c", color: "#0d0f1a", border: "none", borderRadius: 10, padding: "1rem", fontSize: "1rem", cursor: "pointer", fontWeight: 700 }}>← Back to Home</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "#4ade80" : timeLeft > 7 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'Georgia', serif" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <button onClick={onBack} style={{ color: "#7a8090", background: "none", border: "none", cursor: "pointer" }}>← Home</button>
          <div style={{ color: "#f0e6c8" }}>⚡ Rapid Fire</div>
          <div style={{ fontFamily: "monospace", color: "#c9a84c" }}>{idx + 1}/20</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ background: timerColor, height: "100%", width: timerPct + "%", transition: "width 1s linear, background 0.3s", borderRadius: 4 }} />
          </div>
          <div style={{ color: timerColor, fontFamily: "monospace", fontWeight: 700, minWidth: "2rem", textAlign: "right" }}>{timeLeft}s</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 3, marginBottom: "1.5rem" }}>
          <div style={{ background: "#c9a84c", height: "100%", width: (idx / 20 * 100) + "%", borderRadius: 4 }} />
        </div>
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <span style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, padding: "0.2rem 0.6rem", color: "#c9a84c", fontSize: "0.7rem", fontFamily: "monospace" }}>{q.law}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.75rem", marginBottom: "1rem", textAlign: "center" }}>
          <div style={{ color: "#f0e6c8", fontSize: "1.3rem" }}>{q.q}</div>
        </div>
        {state !== "idle" && (
          <div style={{ padding: "1rem", borderRadius: 10, background: state === "correct" ? "rgba(74,222,128,0.08)" : state === "timeout" ? "rgba(148,163,184,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${state === "correct" ? "rgba(74,222,128,0.3)" : state === "timeout" ? "rgba(148,163,184,0.3)" : "rgba(248,113,113,0.3)"}`, marginBottom: "1rem" }}>
            <div style={{ color: state === "correct" ? "#4ade80" : "#f87171", marginBottom: "0.25rem" }}>{state === "correct" ? pick(ENCOURAGEMENT) : state === "timeout" ? "⏱️ Time's up!" : "✗ Not quite"}</div>
            <div style={{ color: "#f0e6c8", fontFamily: "monospace", fontSize: "0.9rem" }}>Answer: {q.a}</div>
            <div style={{ color: "#7a8090", fontSize: "0.8rem", marginTop: "0.25rem", fontStyle: "italic" }}>💡 {q.hint}</div>
          </div>
        )}
        {state === "idle" && (
          <>
            <input ref={inputRef} autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && input.trim() && submit()} placeholder="Type your answer and press Enter..."
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "0.875rem 1rem", color: "#f0e6c8", fontSize: "1rem", fontFamily: "'Georgia', serif", outline: "none", marginBottom: "0.75rem" }} />
            <button onClick={submit} disabled={!input.trim()} style={{ width: "100%", background: input.trim() ? "#c9a84c" : "rgba(201,168,76,0.15)", color: input.trim() ? "#0d0f1a" : "#6a5830", border: "none", borderRadius: 10, padding: "0.875rem", fontSize: "1rem", cursor: input.trim() ? "pointer" : "default", fontWeight: 700 }}>Submit</button>
          </>
        )}
        {state !== "idle" && <button onClick={next} style={{ width: "100%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.35)", color: "#c9a84c", borderRadius: 10, padding: "0.875rem", fontSize: "1rem", cursor: "pointer", fontWeight: 600 }}>Next →</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState("home");
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState({});

  function recordResult(exId, correct) {
    setProgress(prev => ({
      ...prev,
      [exId]: {
        correct: correct || prev[exId]?.correct || false,
        attempts: (prev[exId]?.attempts || 0) + 1,
      }
    }));
  }

  const sharedProps = { progress, onRecord: recordResult };

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {screen === "home"       && <HomeScreen onSelect={setScreen} progress={progress} onSettings={() => setShowSettings(true)} />}
      {screen === "exercises"  && <ExerciseBrowserMode onBack={() => setScreen("home")} {...sharedProps} />}
      {screen === "flashcards" && <FlashcardMode onBack={() => setScreen("home")} />}
      {screen === "matching"   && <MatchingMode  onBack={() => setScreen("home")} />}
      {screen === "practice"   && <PracticeMode  onBack={() => setScreen("home")} />}
      {screen === "rapid"      && <RapidFireMode onBack={() => setScreen("home")} />}
      {screen === "progress"   && <ProgressView  onBack={() => setScreen("home")} progress={progress} />}
    </>
  );
}
