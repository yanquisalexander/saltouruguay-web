# 🧪 Audio Manager Testing Guide

## Manual Testing Checklist

### ✅ Basic Functionality

- [ ] **Play Audio**
  - Open admin panel and press `A` to open audio manager
  - Click Play on any audio
  - Verify audio starts playing immediately
  - Verify green pulse indicator appears
  - Verify status shows "▶ Reproduciendo"

- [ ] **Pause Audio**
  - While audio is playing, click Pause
  - Verify audio pauses
  - Verify green pulse disappears
  - Verify status shows "⏹ Detenido"

- [ ] **Stop Audio**
  - Play an audio, let it play for a few seconds
  - Click Stop
  - Click Play again
  - Verify audio starts from the beginning (not from pause point)

- [ ] **Volume Control**
  - Play an audio
  - Move volume slider to 50%
  - Verify volume changes immediately
  - Verify slider shows "50%"

- [ ] **Loop Toggle**
  - Click Loop button to enable
  - Verify button shows "Loop ON"
  - Verify 🔁 icon appears next to audio name
  - Play the audio and let it finish
  - Verify audio restarts automatically

### ✅ Multi-Client Synchronization

These tests require multiple browser tabs/windows:

- [ ] **Play Sync**
  - Open admin panel in Tab 1
  - Open regular player view in Tab 2
  - In Tab 1, play an audio
  - Verify Tab 2 plays the same audio immediately

- [ ] **Pause Sync**
  - With audio playing in both tabs
  - In Tab 1, pause the audio
  - Verify Tab 2 pauses immediately

- [ ] **Stop Sync**
  - With audio playing in both tabs
  - In Tab 1, stop the audio
  - Verify Tab 2 stops and resets

- [ ] **Volume Sync**
  - With audio playing
  - In Tab 1, change volume to 30%
  - Verify Tab 2's volume changes to 30%

- [ ] **Loop Sync**
  - In Tab 1, toggle loop on
  - Verify Tab 2 shows loop indicator
  - Let audio finish in both tabs
  - Verify both restart automatically

- [ ] **Mute All Sync**
  - Play 2-3 different audios
  - In Tab 1, click "Silenciar Todo"
  - Verify all audio in Tab 2 is muted (volume = 0)

- [ ] **Stop All Sync**
  - Play 2-3 different audios
  - In Tab 1, click "Detener Todo"
  - Verify all audio in Tab 2 stops

### ✅ State Persistence

- [ ] **Reconnection**
  - Play an audio with loop enabled and volume at 70%
  - Close and reopen the admin panel
  - Verify state is restored correctly (playing, loop, volume)

- [ ] **Fresh Client**
  - Start playing audio with loop and custom volume
  - Open a new browser tab/window
  - Verify new client loads current state correctly

### ✅ Multiple Admins

- [ ] **Concurrent Admin Control**
  - Open admin panel in 2 different browsers (or incognito)
  - In Browser 1, play an audio
  - In Browser 2, verify audio plays
  - In Browser 2, change volume
  - In Browser 1, verify volume changes
  - Verify no conflicts or desyncs

### ✅ Edge Cases

- [ ] **Rapid Control Changes**
  - Quickly click Play → Pause → Play → Stop
  - Verify all commands are processed
  - Verify no audio glitches or stuck states

- [ ] **Multiple Audio Playback**
  - Play 3-4 different audios simultaneously
  - Verify all play correctly
  - Stop one audio
  - Verify others continue playing
  - Use "Stop All" to stop everything

- [ ] **Volume Edge Cases**
  - Set volume to 0% (mute)
  - Set volume to 100% (max)
  - Verify audio still plays/stops correctly

- [ ] **Loop with Stop/Pause**
  - Enable loop and play audio
  - Click pause while looping
  - Resume - verify still loops
  - Click stop while looping
  - Play again - verify still loops

### ✅ UI/UX

- [ ] **Keyboard Shortcuts**
  - Press `A` key - verify dialog opens
  - Press `A` again - verify dialog closes
  - Open dialog, press `ESC` - verify dialog closes
  - Type in another input field, press `A` - verify dialog doesn't open

- [ ] **Visual Indicators**
  - Playing audio shows green pulse
  - Loop shows 🔁 icon
  - Volume slider updates in real-time
  - Status text updates correctly

### ✅ Security

- [ ] **Non-Admin Access**
  - Login as non-admin user
  - Verify audio manager doesn't appear (press `A` does nothing)
  - Open browser console
  - Try to manually call audio actions
  - Verify "UNAUTHORIZED" error

### ✅ Performance

- [ ] **Audio Preloading**
  - Open developer tools → Network tab
  - Refresh page
  - Verify audio files are preloaded
  - Click play on any audio
  - Verify instant playback (no loading delay)

- [ ] **Memory Leaks**
  - Play and stop audio multiple times
  - Check browser memory usage
  - Verify no significant memory increase

### ✅ Error Handling

- [ ] **Network Issues**
  - Disconnect internet
  - Try to play audio
  - Verify graceful error handling
  - Reconnect internet
  - Verify system recovers

- [ ] **Invalid Audio ID**
  - Open browser console
  - Try to play non-existent audio ID
  - Verify proper error message

## Automated Testing (Future)

Consider implementing:
- Unit tests for action handlers
- Integration tests for Pusher events
- E2E tests for multi-client sync
- Performance tests for concurrent users

## Known Limitations

- No seeking functionality (by design)
- Audio must be served from CDN
- Requires Redis for state persistence
- Requires Pusher for real-time sync
- Admin-only control (by design)

## Success Criteria

All tests should pass with:
- ✅ No audio glitches or stuttering
- ✅ Perfect synchronization across clients
- ✅ No state desync or conflicts
- ✅ Instant response to controls
- ✅ Proper error messages
- ✅ Clean UI updates
