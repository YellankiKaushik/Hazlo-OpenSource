import { Task } from '../types';

const generateId = () => crypto.randomUUID();

/**
 * Extracts tasks from raw text using simple pattern matching.
 * Looks for:
 * - "and" separated tasks: "do this and do that"
 * - numbered lists: "1. first task"
 * - bullet points: "- task", "* task"
 * - imperative verbs at start: "Call someone", "Finish design"
 */
export function extractTasks(rawText: string): Task[] {
    const tasks: Task[] = [];
    const now = new Date().toISOString();

    // Clean up the text
    const text = rawText.trim();

    // Pattern 1: Numbered lists (1. task, 2. task)
    const numberedPattern = /^\d+[\.\)]\s*(.+?)(?=\n\d+[\.\)]\s*|\n*$)/gm;
    let match;
    const numberedTasks: string[] = [];

    while ((match = numberedPattern.exec(text)) !== null) {
        numberedTasks.push(match[1].trim());
    }

    // Pattern 2: Bullet points (- task, * task)
    const bulletPattern = /^[-*]\s+(.+?)$/gm;
    const bulletTasks: string[] = [];

    while ((match = bulletPattern.exec(text)) !== null) {
        bulletTasks.push(match[1].trim());
    }

    // Pattern 3: "and" separated tasks (imperative sentences)
    const andTasks: string[] = [];

    // Simple heuristic: split by " and " when it's clearly separating tasks
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim());

    sentences.forEach(sentence => {
        // Check for "X and Y" pattern at start of sentence
        const andMatch = sentence.match(/^([A-Z][^.]+?)\s+and\s+([^.!?]+)$/i);
        if (andMatch) {
            const task1 = andMatch[1].trim();
            const task2 = andMatch[2].trim();
            if (task1.length > 2) andTasks.push(task1);
            if (task2.length > 2) andTasks.push(task2);
        }
    });

    // Combine all found tasks
    const allTaskTexts = [...numberedTasks, ...bulletTasks, ...andTasks];

    // If no explicit tasks found, check if the text itself is task-like
    if (allTaskTexts.length === 0) {
        // Check for imperative mood (starts with verb)
        const imperativePattern =
            /^(call|email|send|make|do|finish|start|buy|get|check|review|update|create|write|schedule|remind|meet|submit|pay|book|plan|prepare|review|organize|clean|fix|build|design|develop|test|deploy|launch|open|close|read|listen|watch|learn|study|practice|exercise|run|walk|cook|eat|drink|sleep|rest|relax|meditate|pray|think|imagine|dream|create|invent|discover|explore|visit|travel|return|arrive|leave|stay|go|come|see|find|look|watch|hear|listen|feel|taste|smell|touch|sense|know|understand|remember|forget|believe|trust|hope|wish|want|need|desire|like|love|hate|fear|avoid|prefer|choose|decide|agree|disagree|promise|help|support|encourage|teach|share|explain|demonstrate|show|present|report|describe|discuss|debate|argue|negotiate|decide|vote|select|pick|hire|fire|promote|demote|raise|lower|increase|decrease|add|subtract|multiply|divide|calculate|measure|count|weigh|scale|grade|score|rank|rate|review|evaluate|assess|test|try|attempt|experiment|compare|contrast|analyze|examine|inspect|investigate|research|study|explore|discover|find|locate|identify|recognize|spot|notice|see|observe|watch|monitor|track|follow|catch|grab|hold|keep|store|save|backup|export|import|convert|transform|change|modify|adjust|adapt|edit|revise|improve|enhance|upgrade|update|upgrade|fix|repair|restore|maintain|clean|organize|sort|arrange|classify|categorize|group|filter|search|query|retrieve|fetch|download|upload|transfer|copy|duplicate|clone|print|scan|copy|paste|cut|delete|remove|erase|clear|reset|restart|reboot|reload|refresh|sync|connect|disconnect|login|logout|sign|register|subscribe|unsubscribe|join|leave|exit|quit|stop|start|begin|end|finish|complete|accomplish|achieve|realize|attain|reach|obtain|gain|earn|win|beat|defeat|overcome|surpass|exceed|outperform)/i;

        // If it looks like a single task
        if (imperativePattern.test(text) && text.length < 100) {
            tasks.push({
                id: generateId(),
                text: text,
                completed: false,
                createdAt: now,
            });
        }
    } else {
        // Add all extracted tasks
        allTaskTexts.forEach(taskText => {
            if (taskText.length > 2 && taskText.length < 200) {
                tasks.push({
                    id: generateId(),
                    text: taskText,
                    completed: false,
                    createdAt: now,
                });
            }
        });
    }

    return tasks;
}
