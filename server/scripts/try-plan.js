import { planSearch } from '../src/lib/llm.js';

const question = process.argv.slice(2).join(' ');
const plan = await planSearch(question, '2026-09-22');
console.log(plan);
