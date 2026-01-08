export function roundTitle(round: number) {
  if (round === 1) return "Round 1: Everyone Is Innocent";
  if (round === 2) return "Round 2: The Thing That Shouldn’t Matter";
  if (round === 3) return "Round 3: Time Breaks";
  if (round === 4) return "Final: Accusations & Reveal";
  return "Pre-Game";
}

export function defaultNarration(round: number) {
  if (round === 1) {
    return `Good evening.

Tonight is a murder mystery.

Someone didn’t make it through the night.

No one here is in danger.

At least not physically.

Socially?

We’ll see.`;
  }

  if (round === 2) {
    return `Earlier tonight, Daniel was alive.

Later, he wasn’t.

A glass was found in the sink.

It had been rinsed.

Not cleaned.

Just enough to remove fingerprints.

That glass did not belong to Daniel.`;
  }

  if (round === 3) {
    return `This is the round where time becomes a problem.

Everyone remembers something.

Just not the same way.`;
  }

  if (round === 4) {
    return `This is it.

Make your accusation.

Commit to a story.

Let’s find out who was right.`;
  }

  return `Waiting for the host to begin.`;
}

export function defaultPrivatePrompt(round: number, playerName: string) {
  if (round === 1) {
    return `Hi ${playerName}.

Your goal this round:
- Be yourself
- Do not accuse anyone
- Establish your normal behavior

If the room gets quiet, speak up.`;
  }

  if (round === 2) {
    return `Hi ${playerName}.

Your goal this round:
- Watch reactions to the glass detail
- Ask one question
- Avoid overexplaining`;
  }

  if (round === 3) {
    return `Hi ${playerName}.

Your goal this round:
- Pay attention to timelines
- Notice contradictions`;
  }

  if (round === 4) {
    return `Hi ${playerName}.

Your goal:
- Make a final accusation
- Support it with one reason`;
  }

  return `Waiting to start.`;
}
