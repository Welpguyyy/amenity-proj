// src/app/lib/streakService.ts
import supadata from "./supabaseclient";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const todayStr = dayjs().tz('Asia/Manila').format('YYYY-MM-DD');

// Get the user's streak and HP for today
export async function getUserStreakAndHP(user_id: string) {
  const { data, error } = await supadata
    .from('streaks_input')
    .select('*')
    .eq('user_id', user_id)
    .eq('date', todayStr)
    .single();

  if (error || !data) {
    const { data: lastData } = await supadata
      .from('streaks_input')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    return lastData;
  }

  return data;
}

// When user finishes reading, restore HP and increment streak
export async function finishReading(user_id: string) {
  const today = dayjs().tz('Asia/Manila');
  const todayStr = today.format('YYYY-MM-DD');

  // ✅ Fetch the user's streak row (there should always be one)
  const { data: streak, error: fetchError } = await supadata
    .from('streaks_input')
    .select('*')
    .eq('user_id', user_id)
    .single();

  if (fetchError || !streak) {
    console.error("❌ Error fetching user's streak row:", fetchError);
    return { error: fetchError };
  }

  const lastDateStr = dayjs(streak.date).tz('Asia/Manila').format('YYYY-MM-DD');

  // ✅ Already done today
  if (lastDateStr === todayStr) {
    console.log("⏭️ Already completed reading today.");
    return { data: streak, error: null };
  }

  // 🧠 Calculate new streak and dynamic stage
  const daysSinceLast = today.diff(dayjs(streak.date).tz('Asia/Manila'), 'day');

  let newStreak = 1;
  let newStage;

  if (daysSinceLast === 1) {
    newStreak = streak.streaknum + 1;
    newStage = Math.max(streak.Stage - 1, 1); // 👈 decrease stage on successful read
  } else if (daysSinceLast >= 3) {
    newStage = 4; // max stage if 3 or more days skipped
  } else {
    newStage = Math.min(streak.Stage + daysSinceLast, 4);
  }

  // ✅ Update the existing row
  const { data, error } = await supadata
    .from('streaks_input')
    .update({
      date: todayStr,
      streaknum: newStreak,
      Stage: newStage
    })
    .eq('user_id', user_id);

  if (error) {
    console.error("❌ Failed to update streak:", error);
  } else {
    console.log("✅ Streak updated:", data);
  }

  return { data, error };
}



