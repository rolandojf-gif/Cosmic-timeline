/** Only *automatic* playback stops invite the visitor to continue.
 * Manual Pause, timeline scrubbing, or selecting a stop do not show the cue.
 */
export function shouldShowContinueCue(playing: boolean, automaticPause: boolean | undefined): boolean {
  return !playing && automaticPause === true;
}
