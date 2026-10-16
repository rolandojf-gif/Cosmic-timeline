/** Invite the visitor to resume whenever the journey actually stops.
 * Don't display the cue on initial load or while scrubbing the slider.
 * Manual Pause and milestone navigation should also be discoverable.
 */
export function shouldShowContinueCue(
  playing: boolean,
  atMilestone: boolean | undefined,
  wasPlaying: boolean,
): boolean {
  return !playing && (atMilestone === true || wasPlaying);
}
