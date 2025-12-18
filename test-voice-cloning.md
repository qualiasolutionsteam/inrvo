# Voice Cloning Implementation Test Plan

## Setup Checklist

1. ✅ Environment variables configured
   - `VITE_ELEVENLABS_API_KEY` added to .env.local

2. ✅ Core services created
   - `src/lib/elevenlabs.ts` - ElevenLabs API wrapper
   - `src/lib/voiceService.ts` - Unified TTS routing
   - `src/lib/credits.ts` - Credit management

3. ✅ Database migrations created
   - `001_add_voice_cloning.sql` - Schema updates
   - `002_credit_functions.sql` - SQL functions

4. ✅ Updated components
   - `types.ts` - Added elevenlabsVoiceId field
   - `lib/supabase.ts` - Updated createVoiceProfile function
   - `App.tsx` - Integrated ElevenLabs in voice cloning flow

## Test Steps

### 1. Test Basic App Functionality
```bash
npm run dev
```
- Ensure app loads without errors
- Check that all imports resolve correctly

### 2. Test Database Migration
- Run migrations in Supabase dashboard
- Verify new tables/columns exist:
  - `user_credits` table
  - `voice_cloning_usage` table
  - `voice_usage_limits` table
  - `elevenlabs_voice_id` column in `voice_profiles`

### 3. Test Voice Cloning Flow
1. Sign in to the app
2. Click the voice cloning button (waveform icon)
3. Record a 30-second voice sample
4. Save the voice clone
5. Verify:
   - API call to ElevenLabs is made
   - Voice ID is stored in database
   - New voice appears in voice selector
   - Voice shows as "ElevenLabs" provider

### 4. Test TTS Generation
1. Select the cloned voice
2. Enter a meditation text
3. Generate and play audio
4. Verify:
   - Uses ElevenLabs TTS API
   - Credits are deducted
   - Audio plays correctly
   - Voice sounds like the recorded sample

### 5. Test Credit System
1. Check initial credit balance (should be 10,000)
2. Clone a voice (should deduct 5,000 credits)
3. Generate meditation (should deduct TTS credits)
4. Verify limits work (2 clones per month)

## Debugging Tips

### Check Browser Console
- Network tab for API calls
- Console for error messages

### Common Issues
1. **CORS errors**: Ensure API key is correct and origin is whitelisted in ElevenLabs
2. **Audio format**: ElevenLabs requires 30+ seconds, ensure recording meets requirement
3. **Database errors**: Run migrations in correct order
4. **Credit errors**: Verify user is authenticated and credits table exists

### ElevenLabs API Testing
```javascript
// Test direct API call in browser console
fetch('https://api.elevenlabs.io/v1/user', {
  headers: {
    'xi-api-key': 'YOUR_API_KEY'
  }
}).then(r => r.json()).then(console.log)
```

## Success Indicators
- ✅ Voice cloning creates a voice in ElevenLabs dashboard
- ✅ Generated audio uses cloned voice
- ✅ Credits are tracked correctly
- ✅ Error messages are user-friendly
- ✅ App remains functional with existing Gemini voices