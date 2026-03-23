import React, { useState, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  googleProvider, 
  auth, 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc
} from './src/firebase';
import { User, Appliance, MaintenanceTask, UserProfile } from './src/types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Camera, 
  Settings, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Wrench,
  ShieldCheck,
  Zap,
  Info,
  X,
  Trash2
} from 'lucide-react-native';
import { format, addMonths, isBefore, parseISO } from 'date-fns';

// --- Components ---

const Button = ({ onPress, title, variant = 'primary', icon: Icon, loading }: any) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={loading}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        isDanger && styles.buttonDanger,
        isSecondary && styles.buttonSecondary,
        isOutline && styles.buttonOutline,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#10b981' : '#fff'} />
      ) : (
        <View style={styles.buttonContent}>
          {Icon && <Icon size={20} color={isOutline ? '#10b981' : '#fff'} />}
          <Text style={[styles.buttonText, isOutline && styles.buttonTextOutline]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

const Badge = ({ children, variant = 'default' }: any) => {
  const isSuccess = variant === 'success';
  const isWarning = variant === 'warning';
  const isDanger = variant === 'danger';

  return (
    <View style={[
      styles.badge,
      isSuccess && styles.badgeSuccess,
      isWarning && styles.badgeWarning,
      isDanger && styles.badgeDanger,
    ]}>
      <Text style={[
        styles.badgeText,
        isSuccess && styles.badgeTextSuccess,
        isWarning && styles.badgeTextWarning,
        isDanger && styles.badgeTextDanger,
      ]}>
        {children}
      </Text>
    </View>
  );
};

// --- Main App ---

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Fetch Profile
        onSnapshot(doc(db, 'users', u.uid), (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            const userDocRef = doc(db, 'users', u.uid);
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              homeHealthScore: 100,
              lastCalculated: new Date().toISOString()
            };
            setDoc(userDocRef, newProfile);
          }
        });

        // Fetch Appliances
        const qA = query(collection(db, 'appliances'), where('uid', '==', u.uid), orderBy('createdAt', 'desc'));
        onSnapshot(qA, (s) => {
          setAppliances(s.docs.map(d => ({ id: d.id, ...d.data() } as Appliance)));
        });

        // Fetch Tasks
        const qT = query(collection(db, 'tasks'), where('uid', '==', u.uid), orderBy('dueDate', 'asc'));
        onSnapshot(qT, (s) => {
          setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceTask)));
        });
      } else {
        setProfile(null);
        setAppliances([]);
        setTasks([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const calculateHealthScore = () => {
    if (tasks.length === 0) return 100;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const total = tasks.length;
    const score = Math.max(0, 100 - (overdue * 20) - (pending * 5));
    return Math.round(score);
  };

  useEffect(() => {
    if (user && tasks.length > 0) {
      const score = calculateHealthScore();
      if (profile && profile.homeHealthScore !== score) {
        updateDoc(doc(db, 'users', user.uid), { 
          homeHealthScore: score,
          lastCalculated: new Date().toISOString()
        });
      }
    }
  }, [tasks]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.logoContainer}>
          <ShieldCheck size={60} color="#10b981" />
        </View>
        <Text style={styles.authTitle}>Home Maintenance Assistant</Text>
        <Text style={styles.authSubtitle}>
          Automatically track, manage, and maintain all your home appliances with ease.
        </Text>
        <Button onPress={handleLogin} title="Sign in with Google" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <ShieldCheck size={24} color="#10b981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Home Health</Text>
            <Text style={styles.headerSubtitle}>Maintenance Assistant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Image source={{ uri: user.photoURL || '' }} style={styles.profileImage} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {activeTab === 'dashboard' && (
          <View style={styles.tabContent}>
            {/* Health Score Card */}
            <Card style={styles.healthCard}>
              <View style={styles.healthCardContent}>
                <Text style={styles.healthCardLabel}>Home Health Score</Text>
                <View style={styles.healthScoreContainer}>
                  <Text style={styles.healthScore}>{profile?.homeHealthScore || 100}</Text>
                  <Text style={styles.healthScoreMax}>/ 100</Text>
                </View>
                <Text style={styles.healthCardDesc}>
                  {profile?.homeHealthScore === 100 ? 'Great job! All systems are running optimally.' : 'Some maintenance tasks need your attention.'}
                </Text>
              </View>
              <View style={styles.healthCardIcon}>
                <Zap size={80} color="#10b981" opacity={0.1} />
              </View>
            </Card>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.actionButton}>
                <Camera size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Scan Label</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('appliances')} style={[styles.actionButton, styles.actionButtonSecondary]}>
                <PlusCircle size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Add Manually</Text>
              </TouchableOpacity>
            </View>

            {/* Upcoming Tasks */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
                <TouchableOpacity onPress={() => setActiveTab('tasks')}>
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.taskList}>
                {tasks.filter(t => t.status !== 'completed').slice(0, 3).map(task => (
                  <TaskItem key={task.id} task={task} onPress={() => setSelectedTask(task)} />
                ))}
                {tasks.filter(t => t.status !== 'completed').length === 0 && (
                  <View style={styles.emptyState}>
                    <CheckCircle2 size={48} color="#27272a" />
                    <Text style={styles.emptyStateText}>No pending tasks. You're all set!</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'appliances' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.pageTitle}>My Appliances</Text>
              <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.roundButton}>
                <PlusCircle size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.grid}>
              {appliances.map(appliance => (
                <TouchableOpacity key={appliance.id} style={styles.applianceCard}>
                  <View style={styles.applianceIcon}>
                    <Wrench size={32} color="#52525b" />
                  </View>
                  <View style={styles.applianceInfo}>
                    <Text style={styles.applianceName}>{appliance.name}</Text>
                    <Text style={styles.applianceMeta}>{appliance.brand} • {appliance.type}</Text>
                  </View>
                  <ChevronRight size={20} color="#3f3f46" />
                </TouchableOpacity>
              ))}
              {appliances.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No appliances added yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.tabContent}>
            <Text style={styles.pageTitle}>Maintenance Tasks</Text>
            <View style={styles.taskList}>
              {tasks.map(task => (
                <TaskItem key={task.id} task={task} onPress={() => setSelectedTask(task)} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            <View style={styles.profileHeader}>
              <Image source={{ uri: user.photoURL || '' }} style={styles.profileLargeImage} />
              <Text style={styles.profileName}>{user.displayName}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>

            <View style={styles.menu}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Settings size={20} color="#a1a1aa" />
                  <Text style={styles.menuItemText}>App Settings</Text>
                </View>
                <ChevronRight size={20} color="#3f3f46" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Info size={20} color="#a1a1aa" />
                  <Text style={styles.menuItemText}>Help & Support</Text>
                </View>
                <ChevronRight size={20} color="#3f3f46" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.menuItemDanger]}>
                <View style={styles.menuItemLeft}>
                  <LogOut size={20} color="#ef4444" />
                  <Text style={[styles.menuItemText, styles.textDanger]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Home" />
        <NavButton active={activeTab === 'appliances'} onClick={() => setActiveTab('appliances')} icon={Wrench} label="Appliances" />
        <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={Clock} label="Tasks" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={Settings} label="Profile" />
      </View>

      {/* Modals */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <ScannerModal onClose={() => setShowScanner(false)} onSuccess={() => setShowScanner(false)} />
      </Modal>

      <Modal visible={!!selectedTask} animationType="slide" transparent={false}>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onComplete={async () => {
              await updateDoc(doc(db, 'tasks', selectedTask.id), { 
                status: 'completed',
                completedAt: new Date().toISOString()
              });
              
              const nextDate = addMonths(parseISO(selectedTask.dueDate), selectedTask.intervalMonths);
              await addDoc(collection(db, 'tasks'), {
                uid: user.uid,
                applianceId: selectedTask.applianceId,
                title: selectedTask.title,
                description: selectedTask.description,
                instructions: selectedTask.instructions,
                dueDate: format(nextDate, 'yyyy-MM-dd'),
                status: 'pending',
                intervalMonths: selectedTask.intervalMonths
              });

              setSelectedTask(null);
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

// --- Sub-components ---

function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <TouchableOpacity onPress={onClick} style={styles.navButton}>
      <Icon size={24} color={active ? '#10b981' : '#71717a'} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskItem({ task, onPress }: { task: MaintenanceTask, onPress: () => void }) {
  const isOverdue = isBefore(parseISO(task.dueDate), new Date()) && task.status !== 'completed';
  
  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress}>
      <View style={[styles.taskIconContainer, 
        task.status === 'completed' ? styles.bgSuccess : isOverdue ? styles.bgDanger : styles.bgWarning
      ]}>
        {task.status === 'completed' ? (
          <CheckCircle2 size={24} color="#10b981" />
        ) : isOverdue ? (
          <AlertCircle size={24} color="#ef4444" />
        ) : (
          <Clock size={24} color="#f59e0b" />
        )}
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.taskDate}>{format(parseISO(task.dueDate), 'MMM d, yyyy')}</Text>
      </View>
      {isOverdue && <Badge variant="danger">Overdue</Badge>}
      {task.status === 'completed' && <Badge variant="success">Done</Badge>}
      {task.status === 'pending' && !isOverdue && <Badge variant="warning">Soon</Badge>}
    </TouchableOpacity>
  );
}

function ScannerModal({ onClose, onSuccess }: any) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  // In a real Expo app, we'd use expo-camera. For this web preview, we'll simulate.
  const handleSimulateScan = async () => {
    setScanning(true);
    setTimeout(async () => {
      const mockResult = {
        brand: 'Samsung',
        type: 'Refrigerator',
        model: 'RF28R7351SR',
        serialNumber: 'S123456789X'
      };
      setResult(mockResult);
      setScanning(false);
    }, 2000);
  };

  const handleSave = async () => {
    if (!result) return;
    setScanning(true);
    try {
      const appRef = await addDoc(collection(db, 'appliances'), {
        uid: auth.currentUser?.uid,
        name: `${result.brand || ''} ${result.type}`,
        type: result.type,
        brand: result.brand,
        model: result.model,
        serialNumber: result.serialNumber,
        createdAt: new Date().toISOString()
      });

      const taskRes = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: result.type, brand: result.brand, model: result.model })
      });
      const tasks = await taskRes.json();

      for (const t of tasks) {
        await addDoc(collection(db, 'tasks'), {
          uid: auth.currentUser?.uid,
          applianceId: appRef.id,
          title: t.title,
          description: t.description,
          instructions: t.instructions,
          dueDate: t.initialDueDate,
          status: 'pending',
          intervalMonths: t.intervalMonths
        });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Scan Label</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        {!result ? (
          <TouchableOpacity onPress={handleSimulateScan} style={styles.scannerArea}>
            <Camera size={48} color="#52525b" />
            <Text style={styles.scannerText}>Tap to Scan Appliance Label</Text>
            {scanning && <ActivityIndicator style={styles.mt20} color="#10b981" />}
          </TouchableOpacity>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Type</Text>
                <Text style={styles.resultValue}>{result.type}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Brand</Text>
                <Text style={styles.resultValue}>{result.brand}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Model</Text>
                <Text style={styles.resultValue}>{result.model}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Serial</Text>
                <Text style={styles.resultValue}>{result.serialNumber}</Text>
              </View>
            </View>
            <Button onPress={handleSave} title="Add Appliance & Tasks" loading={scanning} />
            <TouchableOpacity onPress={() => setResult(null)} style={styles.mt20}>
              <Text style={styles.textCenter}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function TaskDetailModal({ task, onClose, onComplete }: any) {
  const [completing, setCompleting] = useState(false);

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Task Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} contentContainerStyle={styles.p24}>
        <Badge variant={task.status === 'completed' ? 'success' : 'warning'}>{task.status}</Badge>
        <Text style={styles.taskDetailTitle}>{task.title}</Text>
        <Text style={styles.taskDetailDesc}>{task.description}</Text>

        <View style={styles.instructionsContainer}>
          <View style={styles.instructionsHeader}>
            <Info size={20} color="#10b981" />
            <Text style={styles.instructionsTitle}>Instructions</Text>
          </View>
          <Text style={styles.instructionsText}>{task.instructions}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{format(parseISO(task.dueDate), 'MMM d, yyyy')}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Frequency</Text>
            <Text style={styles.infoValue}>Every {task.intervalMonths} months</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        {task.status !== 'completed' && (
          <Button 
            onPress={async () => {
              setCompleting(true);
              await onComplete();
              setCompleting(false);
            }} 
            title="Mark as Completed"
            loading={completing}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  authContainer: { flex: 1, backgroundColor: '#000', padding: 24, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { width: 100, height: 100, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  authTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  authSubtitle: { color: '#a1a1aa', fontSize: 18, textAlign: 'center', marginBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#27272a', backgroundColor: 'rgba(0,0,0,0.5)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconContainer: { width: 40, height: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#71717a', fontSize: 12 },
  profileImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  main: { flex: 1 },
  mainContent: { padding: 20 },
  tabContent: { gap: 24 },
  card: { backgroundColor: 'rgba(24, 24, 27, 0.5)', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 20 },
  healthCard: { overflow: 'hidden' },
  healthCardContent: { zIndex: 1 },
  healthCardLabel: { color: '#71717a', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  healthScoreContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  healthScore: { color: '#10b981', fontSize: 60, fontWeight: 'bold' },
  healthScoreMax: { color: '#71717a', fontSize: 18, fontWeight: '500' },
  healthCardDesc: { color: '#a1a1aa', fontSize: 14, marginTop: 16, maxWidth: 200 },
  healthCardIcon: { position: 'absolute', top: 20, right: 20 },
  quickActions: { flexDirection: 'row', gap: 16 },
  actionButton: { flex: 1, height: 100, backgroundColor: '#059669', borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionButtonSecondary: { backgroundColor: '#27272a' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionLink: { color: '#10b981', fontSize: 14, fontWeight: '500' },
  taskList: { gap: 12 },
  emptyState: { padding: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: '#71717a', marginTop: 12 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  roundButton: { width: 40, height: 40, backgroundColor: '#10b981', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  grid: { gap: 12 },
  applianceCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 12 },
  applianceIcon: { width: 64, height: 64, backgroundColor: '#27272a', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  applianceInfo: { flex: 1 },
  applianceName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  applianceMeta: { color: '#71717a', fontSize: 12 },
  profileHeader: { alignItems: 'center', paddingVertical: 32 },
  profileLargeImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, borderWidth: 2, borderColor: '#10b981' },
  profileName: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileEmail: { color: '#71717a', fontSize: 16 },
  menu: { gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { color: '#fff', fontSize: 16 },
  menuItemDanger: { borderBottomWidth: 0, marginTop: 32 },
  textDanger: { color: '#ef4444' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'rgba(0,0,0,0.8)', borderTopWidth: 1, borderTopColor: '#27272a' },
  navButton: { alignItems: 'center', gap: 4 },
  navLabel: { color: '#71717a', fontSize: 10, fontWeight: '500' },
  navLabelActive: { color: '#10b981' },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 12 },
  taskIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  taskInfo: { flex: 1 },
  taskTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  taskDate: { color: '#71717a', fontSize: 12 },
  bgSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  bgWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  bgDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#27272a' },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  badgeText: { color: '#a1a1aa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  badgeTextSuccess: { color: '#10b981' },
  badgeTextWarning: { color: '#f59e0b' },
  badgeTextDanger: { color: '#ef4444' },
  button: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  buttonPrimary: { backgroundColor: '#059669' },
  buttonSecondary: { backgroundColor: '#27272a' },
  buttonDanger: { backgroundColor: '#ef4444' },
  buttonOutline: { borderWidth: 1, borderColor: '#27272a' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonTextOutline: { color: '#10b981' },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 8, backgroundColor: '#27272a', borderRadius: 20 },
  modalBody: { flex: 1 },
  scannerArea: { flex: 1, margin: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#52525b', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  scannerText: { color: '#52525b', marginTop: 16, fontWeight: '500' },
  resultContainer: { padding: 24, gap: 24 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultItem: { width: '48%', backgroundColor: '#18181b', padding: 12, borderRadius: 12 },
  resultLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  resultValue: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 4 },
  taskDetailTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 8 },
  taskDetailDesc: { color: '#a1a1aa', fontSize: 16, marginTop: 8 },
  instructionsContainer: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, marginTop: 24 },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  instructionsTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  instructionsText: { color: '#a1a1aa', fontSize: 14, lineHeight: 20 },
  infoGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  infoItem: { flex: 1, backgroundColor: '#18181b', padding: 16, borderRadius: 20 },
  infoLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  infoValue: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 4 },
  modalFooter: { padding: 24, borderTopWidth: 1, borderTopColor: '#27272a' },
  mt20: { marginTop: 20 },
  p24: { padding: 24 },
  textCenter: { textAlign: 'center', color: '#71717a' }
});

registerRootComponent(App);
export default App;
