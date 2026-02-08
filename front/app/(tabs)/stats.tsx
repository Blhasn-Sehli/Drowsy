import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  BarChart3,
  Clock,
  ShieldCheck,
  Eye,
  Moon,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Smile } from 'lucide-react-native';
import { useFirebaseStats, useFirebaseAlerts, useFirebaseEmotions } from '@/hooks/use-firebase';
import { AlertData, EmotionData } from '@/services/firebase';

// --- Helpers ---

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // "YYYY-MM-DD" in LOCAL time
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (formatDateKey(date) === formatDateKey(today)) return 'Today';
  if (formatDateKey(date) === formatDateKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getAvailableDays(alerts: Record<string, AlertData>, emotions: Record<string, EmotionData>): string[] {
  const daySet = new Set<string>();
  Object.values(alerts).forEach((a) => {
    if (a.timestamp) daySet.add(formatDateKey(new Date(a.timestamp)));
  });
  Object.values(emotions).forEach((e) => {
    if (e.timestamp) daySet.add(formatDateKey(new Date(e.timestamp)));
  });
  const sorted = Array.from(daySet).sort().reverse();
  const todayKey = formatDateKey(new Date());
  if (!sorted.includes(todayKey)) sorted.unshift(todayKey);
  return sorted;
}

interface DayStats {
  total: number;
  drowsy: number;
  yawn: number;
  hourly: { hour: number; drowsy: number; yawn: number; total: number }[];
}

function computeDayStats(alerts: Record<string, AlertData>, dayKey: string): DayStats {
  // Build 24-hour buckets
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, drowsy: 0, yawn: 0, total: 0 }));
  let drowsy = 0;
  let yawn = 0;
  let total = 0;

  Object.values(alerts).forEach((a) => {
    if (!a.timestamp) return;
    const d = new Date(a.timestamp);
    if (formatDateKey(d) !== dayKey) return;

    total++;
    const h = d.getHours();
    hours[h].total++;

    if (a.type === 'drowsiness') {
      drowsy++;
      hours[h].drowsy++;
    } else if (a.type === 'yawning') {
      yawn++;
      hours[h].yawn++;
    }
  });

  return { total, drowsy, yawn, hourly: hours };
}

// Emotion colors
const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFAA00',
  sad: '#4169E1',
  neutral: '#999',
  angry: '#FF4444',
  surprise: '#FF6B35',
  fear: '#8B5CF6',
  disgust: '#228B22',
};

const EMOTION_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  neutral: '😐',
  angry: '😠',
  surprise: '😮',
  fear: '😨',
  disgust: '🤢',
};

interface EmotionDayStats {
  total: number;
  counts: Record<string, number>;
  hourly: { hour: number; counts: Record<string, number>; total: number }[];
  dominant: string;
}

function computeEmotionDayStats(emotions: Record<string, EmotionData>, dayKey: string): EmotionDayStats {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, counts: {} as Record<string, number>, total: 0 }));
  const counts: Record<string, number> = {};
  let total = 0;

  Object.values(emotions).forEach((e) => {
    if (!e.timestamp || !e.emotion) return;
    const d = new Date(e.timestamp);
    if (formatDateKey(d) !== dayKey) return;

    const em = e.emotion.toLowerCase();
    total++;
    counts[em] = (counts[em] || 0) + 1;

    const h = d.getHours();
    hours[h].total++;
    hours[h].counts[em] = (hours[h].counts[em] || 0) + 1;
  });

  // Find dominant emotion
  let dominant = 'neutral';
  let maxCount = 0;
  Object.entries(counts).forEach(([em, c]) => {
    if (c > maxCount) { maxCount = c; dominant = em; }
  });

  return { total, counts, hourly: hours, dominant };
}

// --- Main Screen ---

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { stats: firebaseStats, loading: statsLoading, error: statsError } = useFirebaseStats();
  const { alerts, loading: alertsLoading, error: alertsError } = useFirebaseAlerts();
  const { emotions, loading: emotionsLoading, error: emotionsError } = useFirebaseEmotions();

  const loading = statsLoading || alertsLoading || emotionsLoading;
  const error = statsError || alertsError || emotionsError;

  // Day navigation
  const availableDays = useMemo(() => getAvailableDays(alerts, emotions), [alerts, emotions]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const selectedDay = availableDays[selectedDayIdx] || formatDateKey(new Date());
  const dayStats = useMemo(() => computeDayStats(alerts, selectedDay), [alerts, selectedDay]);
  const emotionDayStats = useMemo(() => computeEmotionDayStats(emotions, selectedDay), [emotions, selectedDay]);

  const canGoPrev = selectedDayIdx < availableDays.length - 1;
  const canGoNext = selectedDayIdx > 0;

  // Overall stats (from firebase stats node for all-time, or from alerts for the day)
  const overallTotal = firebaseStats?.total_detections || 0;
  const overallDrowsy = firebaseStats?.drowsy_alerts || 0;
  const overallYawn = firebaseStats?.yawn_alerts || 0;

  // Day rates
  const daySafeRate = dayStats.total > 0 ? ((dayStats.total - dayStats.drowsy - dayStats.yawn) / dayStats.total * 100) : 100;
  const dayDrowsyRate = dayStats.total > 0 ? (dayStats.drowsy / dayStats.total * 100) : 0;
  const dayYawnRate = dayStats.total > 0 ? (dayStats.yawn / dayStats.total * 100) : 0;

  // Hourly chart - find max for scaling
  const maxHourly = Math.max(1, ...dayStats.hourly.map(h => h.total));
  const maxEmotionHourly = Math.max(1, ...emotionDayStats.hourly.map(h => h.total));

  // Sorted emotion entries for the day
  const sortedEmotions = useMemo(() => {
    return Object.entries(emotionDayStats.counts).sort((a, b) => b[1] - a[1]);
  }, [emotionDayStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centerContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <ThemedText style={styles.loadingText}>Loading Firebase Stats...</ThemedText>
            <Text style={styles.loadingSubText}>Connecting to real-time database</Text>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBg}>
                <BarChart3 size={22} color="#FFF" />
              </View>
              <View>
                <ThemedText type="title" style={styles.headerTitle}>Statistics</ThemedText>
                <Text style={styles.headerSubtitle}>Real-time Firebase data</Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={18} color="#C62828" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {/* Empty State */}
          {!firebaseStats && !loading && !error && Object.keys(alerts).length === 0 && Object.keys(emotions).length === 0 && (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderIconCircle}>
                <BarChart3 size={48} color="#CCC" />
              </View>
              <ThemedText style={styles.placeholderTitle}>No Statistics Yet</ThemedText>
              <ThemedText style={styles.placeholderText}>
                Start a detection session to see your drowsiness and emotion statistics appear here in real-time.
              </ThemedText>
              <View style={styles.placeholderSteps}>
                <View style={styles.placeholderStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <Text style={styles.stepText}>Start the backend server</Text>
                </View>
                <View style={styles.placeholderStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.stepText}>Open the Detection tab</Text>
                </View>
                <View style={styles.placeholderStep}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <Text style={styles.stepText}>Stats will update automatically</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <Text style={styles.refreshBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats Content */}
          {(firebaseStats || Object.keys(alerts).length > 0 || Object.keys(emotions).length > 0) && (
            <>
              {/* All-Time Overview */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Eye size={20} color="#FF6B35" />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>All-Time Overview</ThemedText>
                </View>
                <View style={styles.overviewRow}>
                  <OverviewCard icon={<Eye size={18} color="#FF6B35" />} label="Total" value={overallTotal.toString()} bgColor="#FFF3E0" accentColor="#FF6B35" />
                  <OverviewCard icon={<Moon size={18} color="#FF4444" />} label="Drowsy" value={overallDrowsy.toString()} bgColor="#FFEBEE" accentColor="#FF4444" />
                  <OverviewCard icon={<Zap size={18} color="#FFAA00" />} label="Yawns" value={overallYawn.toString()} bgColor="#FFF8E1" accentColor="#FFAA00" />
                </View>
              </View>

              {/* Day Picker */}
              <View style={styles.dayPickerSection}>
                <View style={styles.dayPickerCard}>
                  <TouchableOpacity
                    onPress={() => canGoPrev && setSelectedDayIdx(selectedDayIdx + 1)}
                    style={[styles.dayArrow, !canGoPrev && styles.dayArrowDisabled]}
                    disabled={!canGoPrev}
                  >
                    <ChevronLeft size={22} color={canGoPrev ? '#FF6B35' : '#DDD'} />
                  </TouchableOpacity>

                  <View style={styles.dayPickerCenter}>
                    <Calendar size={16} color="#FF6B35" />
                    <Text style={styles.dayPickerText}>
                      {formatDateLabel(new Date(selectedDay + 'T00:00:00'))}
                    </Text>
                    <Text style={styles.dayPickerDate}>{selectedDay}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => canGoNext && setSelectedDayIdx(selectedDayIdx - 1)}
                    style={[styles.dayArrow, !canGoNext && styles.dayArrowDisabled]}
                    disabled={!canGoNext}
                  >
                    <ChevronRight size={22} color={canGoNext ? '#FF6B35' : '#DDD'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day Summary */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <BarChart3 size={20} color="#FF6B35" />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>Day Summary</ThemedText>
                </View>

                {dayStats.total === 0 ? (
                  <View style={styles.emptyDayCard}>
                    <Text style={styles.emptyDayEmoji}>📭</Text>
                    <Text style={styles.emptyDayText}>No alerts on this day</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.overviewRow}>
                      <OverviewCard icon={<Eye size={18} color="#FF6B35" />} label="Alerts" value={dayStats.total.toString()} bgColor="#FFF3E0" accentColor="#FF6B35" />
                      <OverviewCard icon={<Moon size={18} color="#FF4444" />} label="Drowsy" value={dayStats.drowsy.toString()} bgColor="#FFEBEE" accentColor="#FF4444" />
                      <OverviewCard icon={<Zap size={18} color="#FFAA00" />} label="Yawns" value={dayStats.yawn.toString()} bgColor="#FFF8E1" accentColor="#FFAA00" />
                    </View>

                    {/* Day Rates */}
                    <View style={styles.breakdownCard}>
                      <ProgressBar label="Drowsy" percentage={dayDrowsyRate} color="#FF4444" icon="😴" />
                      <ProgressBar label="Yawning" percentage={dayYawnRate} color="#FFAA00" icon="🥱" />
                      <ProgressBar label="Safe" percentage={daySafeRate} color="#44AA44" icon="✅" />
                    </View>
                  </>
                )}
              </View>

              {/* Hourly Breakdown */}
              {dayStats.total > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Clock size={20} color="#FF9800" />
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Hourly Breakdown</ThemedText>
                  </View>
                  <View style={styles.hourlyCard}>
                    <View style={styles.hourlyChart}>
                      {dayStats.hourly.map((h) => (
                        <View key={h.hour} style={styles.hourlyBarCol}>
                          <View style={styles.hourlyBarWrapper}>
                            {/* Stacked bar: drowsy (bottom red) + yawn (middle yellow) */}
                            {h.total > 0 && (
                              <>
                                <View style={[styles.hourlyBarSegment, {
                                  height: `${(h.yawn / maxHourly) * 100}%`,
                                  backgroundColor: '#FFAA00',
                                }]} />
                                <View style={[styles.hourlyBarSegment, {
                                  height: `${(h.drowsy / maxHourly) * 100}%`,
                                  backgroundColor: '#FF4444',
                                }]} />
                              </>
                            )}
                            {h.total === 0 && (
                              <View style={styles.hourlyBarEmpty} />
                            )}
                          </View>
                          {/* Show label every 3 hours */}
                          {h.hour % 3 === 0 && (
                            <Text style={styles.hourlyLabel}>{h.hour.toString().padStart(2, '0')}</Text>
                          )}
                          {h.hour % 3 !== 0 && <View style={{ height: 14 }} />}
                        </View>
                      ))}
                    </View>
                    {/* Legend */}
                    <View style={styles.hourlyLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
                        <Text style={styles.legendText}>Drowsy</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FFAA00' }]} />
                        <Text style={styles.legendText}>Yawn</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ═══ EMOTION STATS ═══ */}

              {/* Emotion Day Summary */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Smile size={20} color="#8B5CF6" />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>Emotions Today</ThemedText>
                </View>

                {emotionDayStats.total === 0 ? (
                  <View style={styles.emptyDayCard}>
                    <Text style={styles.emptyDayEmoji}>😶</Text>
                    <Text style={styles.emptyDayText}>No emotions recorded on this day</Text>
                  </View>
                ) : (
                  <>
                    {/* Dominant Emotion */}
                    <View style={styles.dominantCard}>
                      <Text style={styles.dominantEmoji}>
                        {EMOTION_EMOJIS[emotionDayStats.dominant] || '😐'}
                      </Text>
                      <View style={styles.dominantInfo}>
                        <Text style={styles.dominantLabel}>Dominant Emotion</Text>
                        <Text style={[styles.dominantValue, { color: EMOTION_COLORS[emotionDayStats.dominant] || '#999' }]}>
                          {emotionDayStats.dominant.charAt(0).toUpperCase() + emotionDayStats.dominant.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.dominantCount}>
                        <Text style={styles.dominantCountValue}>{emotionDayStats.total}</Text>
                        <Text style={styles.dominantCountLabel}>readings</Text>
                      </View>
                    </View>

                    {/* Emotion Distribution */}
                    <View style={styles.breakdownCard}>
                      {sortedEmotions.map(([em, count]) => {
                        const pct = (count / emotionDayStats.total) * 100;
                        return (
                          <ProgressBar
                            key={em}
                            label={em.charAt(0).toUpperCase() + em.slice(1)}
                            percentage={pct}
                            color={EMOTION_COLORS[em] || '#999'}
                            icon={EMOTION_EMOJIS[em] || '😐'}
                          />
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              {/* Emotion Hourly Chart */}
              {emotionDayStats.total > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Clock size={20} color="#8B5CF6" />
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Emotions by Hour</ThemedText>
                  </View>
                  <View style={styles.hourlyCard}>
                    <View style={styles.hourlyChart}>
                      {emotionDayStats.hourly.map((h) => {
                        // Find dominant emotion for this hour
                        let dominant = '';
                        let maxC = 0;
                        Object.entries(h.counts).forEach(([em, c]) => {
                          if (c > maxC) { maxC = c; dominant = em; }
                        });
                        const barColor = EMOTION_COLORS[dominant] || '#E8E8E8';

                        return (
                          <View key={h.hour} style={styles.hourlyBarCol}>
                            <View style={styles.hourlyBarWrapper}>
                              {h.total > 0 ? (
                                <View style={[styles.hourlyBarSegment, {
                                  height: `${(h.total / maxEmotionHourly) * 100}%`,
                                  backgroundColor: barColor,
                                }]} />
                              ) : (
                                <View style={styles.hourlyBarEmpty} />
                              )}
                            </View>
                            {h.hour % 3 === 0 && (
                              <Text style={styles.hourlyLabel}>{h.hour.toString().padStart(2, '0')}</Text>
                            )}
                            {h.hour % 3 !== 0 && <View style={{ height: 14 }} />}
                          </View>
                        );
                      })}
                    </View>
                    {/* Emotion Legend - show top 4 */}
                    <View style={styles.hourlyLegend}>
                      {sortedEmotions.slice(0, 4).map(([em]) => (
                        <View key={em} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: EMOTION_COLORS[em] || '#999' }]} />
                          <Text style={styles.legendText}>{em.charAt(0).toUpperCase() + em.slice(1)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Last Activity */}
              {firebaseStats?.last_detection && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Clock size={20} color="#FF9800" />
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Last Activity</ThemedText>
                  </View>
                  <View style={styles.lastActivityCard}>
                    <View style={styles.lastActivityIconBg}>
                      <Clock size={24} color="#FF9800" />
                    </View>
                    <View style={styles.lastActivityText}>
                      <Text style={styles.lastActivityDate}>
                        {new Date(firebaseStats.last_detection).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                      </Text>
                      <Text style={styles.lastActivityTime}>
                        {new Date(firebaseStats.last_detection).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Refresh */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                  <Text style={styles.refreshBtnText}>🔄  Refresh Stats</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Reusable Components ---

function OverviewCard({ icon, label, value, bgColor, accentColor }: {
  icon: React.ReactNode; label: string; value: string; bgColor: string; accentColor: string;
}) {
  return (
    <View style={[styles.overviewCard, { backgroundColor: bgColor }]}>
      <View style={styles.overviewCardIcon}>{icon}</View>
      <Text style={[styles.overviewCardValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.overviewCardLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ label, percentage, color, icon }: {
  label: string; percentage: number; color: string; icon: string;
}) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressIcon}>{icon}</Text>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressPercent, { color }]}>{percentage.toFixed(1)}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
  },
  loadingSubText: {
    marginTop: 6,
    fontSize: 13,
    color: '#999',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  liveBadgeText: {
    color: '#FF4444',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Error
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#C62828',
    flex: 1,
    fontSize: 13,
  },

  // Placeholder
  placeholderContainer: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 50,
  },
  placeholderIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  placeholderSteps: {
    width: '100%',
    marginBottom: 28,
    gap: 14,
  },
  placeholderStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },

  // Day Picker
  dayPickerSection: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  dayPickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 6,
  },
  dayArrow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayArrowDisabled: {
    opacity: 0.4,
  },
  dayPickerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    flexDirection: 'column',
  },
  dayPickerText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 2,
  },
  dayPickerDate: {
    fontSize: 12,
    color: '#999',
  },

  // Overview
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  overviewCardIcon: {
    marginBottom: 8,
  },
  overviewCardValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  overviewCardLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    marginBottom: 0,
    fontSize: 18,
  },

  // Empty day
  emptyDayCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyDayEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  progressRow: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressIcon: {
    fontSize: 16,
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Hourly Chart
  hourlyCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 18,
  },
  hourlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  hourlyBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  hourlyBarWrapper: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hourlyBarSegment: {
    width: '80%',
    borderRadius: 2,
    minHeight: 2,
  },
  hourlyBarEmpty: {
    width: '60%',
    height: 3,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
  },
  hourlyLabel: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
    fontWeight: '600',
  },
  hourlyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Last Activity
  lastActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  lastActivityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastActivityText: {
    flex: 1,
  },
  lastActivityDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lastActivityTime: {
    fontSize: 14,
    color: '#888',
    marginTop: 3,
  },

  // Buttons
  buttonContainer: {
    marginHorizontal: 20,
    marginVertical: 24,
  },
  refreshBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Dominant Emotion Card
  dominantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  dominantEmoji: {
    fontSize: 36,
  },
  dominantInfo: {
    flex: 1,
  },
  dominantLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  dominantValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dominantCount: {
    alignItems: 'center',
  },
  dominantCountValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  dominantCountLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
});
