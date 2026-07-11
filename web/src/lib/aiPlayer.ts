/** Simple AI decision: should the AI draw another card? */
export function aiShouldDraw(params: {
  roundScore: number;
  totalScore: number;
  guardsDrawn: number;
  cardsLeft: number;
  guardsLeft: number;
  targetScore: number;
}): boolean {
  const { roundScore, totalScore, guardsDrawn, cardsLeft, guardsLeft, targetScore } = params;

  // Already bust risk is high — stop if 1 guard drawn and many guards remain
  if (guardsDrawn >= 1) {
    const bustProb = guardsLeft / Math.max(cardsLeft, 1);
    // Stop if bust probability > 30% OR round score is already decent
    if (bustProb > 0.3 || roundScore >= 18) return false;
  }

  // If AI is close to winning, be aggressive
  const needed = targetScore - totalScore;
  if (needed <= roundScore) return false; // banking wins — stop

  // If round score is low, keep drawing
  if (roundScore < 10) return true;

  // If round score is solid (15+), bank it
  if (roundScore >= 20) return false;

  // Medium range: draw if still need a lot
  return needed > 25;
}
