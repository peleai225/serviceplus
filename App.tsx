import React, { useState, useEffect } from 'react';
import { UserRole, User, Mission, Transaction, MissionStatus } from './types';
import { MOCK_USERS, BASE_RATES, COMMISSION_RATE } from './constants';
import Auth from './components/Auth';
import Layout from './components/Layout';
import ClientDashboard from './components/ClientDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import AdminDashboard from './components/AdminDashboard';
import { db, auth } from './services/firebase';
import { sendNotification } from './services/notificationService';
import { requestProviderWithdrawal } from './services/jekoService';
import * as firestoreModule from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
const { signInAnonymously: fbSignInAnonymously } = firebaseAuth as any;

const { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc
} = firestoreModule as any;

const executeWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 3000): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout de connexion à la base de données")), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
};

const App: React.FC = () => {
  // Initialize state with persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('serviplus_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('serviplus_users_local');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MOCK_USERS;
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem('serviplus_missions_local');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('serviplus_transactions_local');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<string>('home');

  // Anonymous Firebase Auth — needed for Firestore security rules (request.auth != null).
  // The app uses its own phone+password auth layer on top.
  useEffect(() => {
    if (auth) {
      fbSignInAnonymously(auth).catch((e: any) => console.warn("Anonymous Firebase Auth failed:", e));
    }
  }, []);

  // Save changes locally to prevent any loss of data
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('serviplus_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('serviplus_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('serviplus_users_local', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('serviplus_missions_local', JSON.stringify(missions));
  }, [missions]);

  useEffect(() => {
    localStorage.setItem('serviplus_transactions_local', JSON.stringify(transactions));
  }, [transactions]);

  // Sync with Firestore (Background sync, non-blocking)
  useEffect(() => {
    let unsubMissions = () => {};
    let unsubUsers = () => {};
    let unsubTransactions = () => {};

    try {
      if (db) {
        // Realtime Firestore Sync for missions
        unsubMissions = onSnapshot(collection(db, "missions"), (snap: any) => {
          if (snap && snap.docs) {
            const fbMissions = snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Mission));
            if (fbMissions.length > 0) {
              setMissions(fbMissions);
            }
          }
        }, (err: any) => console.log("Missions sync status:", err.message));

        // Realtime Firestore Sync for users
        unsubUsers = onSnapshot(collection(db, "users"), (snap: any) => {
          if (snap && snap.docs) {
            const fbUsers = snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as User));
            if (fbUsers.length > 0) {
              setUsers(prev => {
                // Firestore data takes priority; mock data only fills gaps
                const userMap = new Map<string, User>();
                MOCK_USERS.forEach(u => userMap.set(u.phone, u));
                prev.forEach(u => userMap.set(u.phone, u));
                fbUsers.forEach(u => userMap.set(u.phone, u)); // Firestore wins
                return Array.from(userMap.values());
              });
            }
          }
        }, (err: any) => console.log("Users sync status:", err.message));

        // Realtime Firestore Sync for transactions
        unsubTransactions = onSnapshot(collection(db, "transactions"), (snap: any) => {
          if (snap && snap.docs) {
            const fbTx = snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Transaction));
            if (fbTx.length > 0) {
              setTransactions(fbTx);
            }
          }
        }, (err: any) => console.log("Transactions sync status:", err.message));
      }
    } catch (e) {
      console.warn("Firestore sync deactivated or offline.", e);
    }

    return () => {
      unsubMissions();
      unsubUsers();
      unsubTransactions();
    };
  }, []);

  // Handlers for Login & Registration
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('home');
  };

  const handleResetPassword = async (phone: string, newPassword: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let found = false;

    setUsers(prev => prev.map(u => {
      if (u.phone.replace(/\D/g, '') === cleanPhone) {
        found = true;
        const updated = { ...u, password: newPassword };

        // NOTE: passwords are never persisted to Firestore; they remain local-only

        return updated;
      }
      return u;
    }));

    if (!found) {
      // Also look inside MOCK_USERS and insert it into current session so they are modifiable
      const existsInMock = MOCK_USERS.find(m => m.phone.replace(/\D/g, '') === cleanPhone);
      if (existsInMock) {
        const updatedMock = { ...existsInMock, password: newPassword };
        setUsers(prev => [updatedMock, ...prev.filter(u => u.phone.replace(/\D/g, '') !== cleanPhone)]);
        found = true;
      }
    }

    if (!found) {
      throw new Error("Aucun compte trouvé avec ce numéro de téléphone.");
    }
  };

  const handleRegister = async (newUser: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.phone === newUser.phone);
      if (exists) return prev.map(u => u.phone === newUser.phone ? newUser : u);
      return [newUser, ...prev];
    });
    setCurrentUser(newUser);
    setActiveTab('home');

    // Save to Firestore in background (password field intentionally excluded)
    if (db) {
      const { password: _pw, ...safeUser } = newUser;
      executeWithTimeout(setDoc(doc(db, "users", newUser.id), JSON.parse(JSON.stringify(safeUser))), 3000)
        .catch(e => console.warn("Could not save new user to Firestore", e));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleUpdateUser = async (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    if (db) {
      // Strip password from any Firestore update
      const { password: _pw, ...safeFields } = updatedFields as any;
      executeWithTimeout(updateDoc(doc(db, "users", currentUser.id), safeFields), 3000)
        .catch(e => console.warn("Could not update user in Firestore", e));
    }
  };

  const handleAdminUpdateUser = async (userId: string, updatedFields: Partial<User>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, ...updatedFields };
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));
    if (db) {
      executeWithTimeout(updateDoc(doc(db, "users", userId), updatedFields), 3000)
        .catch(e => console.warn("Could not update user in Firestore via admin:", e));
    }
  };

  const handleDeleteAccount = async (userId: string) => {
    if (db) {
      executeWithTimeout(deleteDoc(doc(db, "users", userId)), 3000)
        .catch(e => console.warn("Could not delete user from Firestore", e));
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    setCurrentUser(null);
    setActiveTab('home');
  };

  const handleAddMission = async (newMission: Mission) => {
    setMissions(prev => [newMission, ...prev]);

    if (db) {
      executeWithTimeout(setDoc(doc(db, "missions", newMission.id), JSON.parse(JSON.stringify(newMission))), 3000)
        .catch(e => console.warn("Could not save mission to Firestore", e));
    }
  };

  const handleUpdateMissionStatus = async (missionId: string, status: MissionStatus, providerId?: string, refusalReason?: string) => {
    const mission = missions.find(m => m.id === missionId);

    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        let updated = { ...m, status };
        if (status === MissionStatus.PENDING) {
          updated.providerId = undefined;
          updated.providerName = undefined;
          if (refusalReason) {
            updated.refusalReason = refusalReason;
          }
        } else if (providerId) {
          updated.providerId = providerId;
          const provider = users.find(u => u.id === providerId);
          if (provider) {
            updated.providerName = provider.name;
          }
        }
        return updated;
      }
      return m;
    }));

    // Send in-app notifications
    if (mission) {
      const provider = providerId ? users.find(u => u.id === providerId) : users.find(u => u.id === mission.providerId);
      if (status === MissionStatus.ACCEPTED && providerId) {
        sendNotification(mission.clientId, 'Mission acceptée ✅', `${provider?.name || 'Un prestataire'} a accepté votre mission "${mission.title}".`, 'mission_accepted', missionId);
      } else if (status === MissionStatus.IN_PROGRESS) {
        sendNotification(mission.clientId, 'Mission démarrée 🚀', `${mission.providerName || 'Votre prestataire'} a commencé la mission "${mission.title}".`, 'mission_accepted', missionId);
      } else if (status === MissionStatus.COMPLETED) {
        sendNotification(mission.clientId, 'Mission terminée 🎉', `La mission "${mission.title}" est terminée. Merci de laisser une évaluation.`, 'mission_completed', missionId);
        if (mission.providerId) {
          sendNotification(mission.providerId, 'Paiement reçu 💰', `La mission "${mission.title}" a été validée. Vos gains ont été crédités.`, 'payment_received', missionId);

          // Credit provider wallet
          const providerAmount = mission.providerAmount || mission.totalPrice || 0;
          setUsers(prev => prev.map(u =>
            u.id === mission.providerId
              ? { ...u, walletBalance: (u.walletBalance || 0) + providerAmount }
              : u
          ));
          // Update provider wallet in Firestore
          if (db) {
            const prov = users.find(u => u.id === mission.providerId);
            if (prov) {
              executeWithTimeout(updateDoc(doc(db, "users", mission.providerId), {
                walletBalance: (prov.walletBalance || 0) + providerAmount
              }), 3000).catch(e => console.warn("Could not credit provider wallet:", e));
            }
          }
          // Create INCOME transaction record
          const incomeTx: Transaction = {
            id: `tx_inc_${Date.now()}`,
            userId: mission.providerId,
            userName: mission.providerName,
            amount: providerAmount,
            type: 'INCOME',
            date: new Date().toISOString(),
            method: 'Virement',
            status: 'SUCCESS',
            missionId,
          };
          setTransactions(prev => [incomeTx, ...prev]);
          if (db) {
            executeWithTimeout(setDoc(doc(db, "transactions", incomeTx.id), incomeTx), 3000)
              .catch(e => console.warn("Could not save income transaction:", e));
          }
        }
      } else if (status === MissionStatus.CANCELLED) {
        if (mission.providerId) {
          sendNotification(mission.providerId, 'Mission annulée', `La mission "${mission.title}" a été annulée par le client.`, 'mission_cancelled', missionId);
        }
      } else if (status === MissionStatus.DISPUTED) {
        if (mission.providerId) {
          sendNotification(mission.providerId, 'Litige ouvert ⚠️', `Un litige a été ouvert pour la mission "${mission.title}".`, 'mission_disputed', missionId);
        }
        sendNotification(mission.clientId, 'Litige en cours ⚠️', `Votre litige pour "${mission.title}" est en cours de traitement.`, 'mission_disputed', missionId);
      }
    }

    if (db) {
      let updateData: any = { status };
      if (status === MissionStatus.PENDING) {
        updateData.providerId = null;
        updateData.providerName = null;
        if (refusalReason) {
          updateData.refusalReason = refusalReason;
        }
      } else if (providerId) {
        updateData.providerId = providerId;
        const provider = users.find(u => u.id === providerId);
        if (provider) {
          updateData.providerName = provider.name;
        }
      }
      executeWithTimeout(updateDoc(doc(db, "missions", missionId), updateData), 3000)
        .catch(e => console.warn("Could not update mission in Firestore", e));
    }
  };

  const handleRateMission = async (missionId: string, rating: number, comment: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        return {
          ...m,
          clientRating: rating,
          clientComment: comment
        };
      }
      return m;
    }));

    if (db) {
      executeWithTimeout(updateDoc(doc(db, "missions", missionId), {
        clientRating: rating,
        clientComment: comment
      }), 3000).catch(e => console.warn("Could not save rating in Firestore", e));
    }
  };

  const handleRateClient = async (missionId: string, rating: number, comment: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        return {
          ...m,
          providerRating: rating,
          providerComment: comment
        };
      }
      return m;
    }));

    if (db) {
      executeWithTimeout(updateDoc(doc(db, "missions", missionId), {
        providerRating: rating,
        providerComment: comment
      }), 3000).catch(e => console.warn("Could not save client rating in Firestore", e));
    }
  };

  // Admin and Payout Management
  const handleResolveDispute = async (missionId: string, resolution: 'PAY' | 'REFUND' | MissionStatus) => {
    if (resolution === 'PAY') {
      await handleUpdateMissionStatus(missionId, MissionStatus.COMPLETED);
    } else if (resolution === 'REFUND') {
      await handleUpdateMissionStatus(missionId, MissionStatus.CANCELLED);
    } else {
      await handleUpdateMissionStatus(missionId, resolution as MissionStatus);
    }
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, verified } : null);
    }

    if (db) {
      executeWithTimeout(updateDoc(doc(db, "users", userId), { verified }), 3000)
        .catch(e => console.warn("Could not update verification field in Firestore", e));
    }
  };

  const handlePayout = (userId: string, amount: number) => {
    const user = users.find(u => u.id === userId);
    const newTx: Transaction = {
      id: `tx${Date.now()}`,
      userId,
      userName: user?.name,
      amount,
      type: 'PAYOUT',
      date: new Date().toISOString(),
      method: 'Mobile Money',
      status: 'SUCCESS'
    };
    setTransactions(prev => [newTx, ...prev]);
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, walletBalance: Math.max(0, (u.walletBalance || 0) - amount) };
      }
      return u;
    }));
    // Persist to Firestore
    if (db) {
      executeWithTimeout(setDoc(doc(db, "transactions", newTx.id), newTx), 3000)
        .catch(e => console.warn("Could not save transaction to Firestore", e));
    }
  };

  const handleUpdateMissionBonus = async (missionId: string, bonusAmount: number) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        const b = (m.bonus || 0) + bonusAmount;
        const tp = m.totalPrice + bonusAmount;
        return {
          ...m,
          bonus: b,
          totalPrice: tp,
          providerAmount: tp,
          commission: 0
        };
      }
      return m;
    }));

    if (db) {
      const missionRef = doc(db, "missions", missionId);
      const m = missions.find(x => x.id === missionId);
      if (m) {
        const b = (m.bonus || 0) + bonusAmount;
        const tp = m.totalPrice + bonusAmount;
        executeWithTimeout(updateDoc(missionRef, {
          bonus: b,
          totalPrice: tp,
          providerAmount: tp,
          commission: 0
        }), 3000).catch(e => console.warn("Could not update mission bonus in Firestore", e));
      }
    }
  };

  const handleExtendDuration = async (missionId: string, hours: number, price: number) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        return {
          ...m,
          extendedDurationHours: hours,
          extendedTotalPrice: price,
          extensionStatus: 'PENDING' as any
        };
      }
      return m;
    }));

    if (db) {
      const missionRef = doc(db, "missions", missionId);
      executeWithTimeout(updateDoc(missionRef, {
        extendedDurationHours: hours,
        extendedTotalPrice: price,
        extensionStatus: 'PENDING'
      }), 3000).catch(e => console.warn("Could not save extension request in Firestore", e));
    }
  };

  const handleAnswerExtension = async (missionId: string, accept: boolean) => {
    setMissions(prev => prev.map(m => {
      if (m.id === missionId) {
        if (accept) {
          const finalDuration = m.durationHours + (m.extendedDurationHours || 0);
          const finalPrice = m.totalPrice + (m.extendedTotalPrice || 0);
          const finalProviderAmt = m.providerAmount + (m.extendedTotalPrice || 0);
          return {
            ...m,
            durationHours: finalDuration,
            totalPrice: finalPrice,
            providerAmount: finalProviderAmt,
            extendedDurationHours: 0,
            extendedTotalPrice: 0,
            extensionStatus: 'ACCEPTED' as any
          };
        } else {
          return {
            ...m,
            extendedDurationHours: 0,
            extendedTotalPrice: 0,
            extensionStatus: 'REJECTED' as any
          };
        }
      }
      return m;
    }));

    if (db) {
      const m = missions.find(x => x.id === missionId);
      if (m) {
        const missionRef = doc(db, "missions", missionId);
        if (accept) {
          const finalDuration = m.durationHours + (m.extendedDurationHours || 0);
          const finalPrice = m.totalPrice + (m.extendedTotalPrice || 0);
          const finalProviderAmt = m.providerAmount + (m.extendedTotalPrice || 0);
          executeWithTimeout(updateDoc(missionRef, {
            durationHours: finalDuration,
            totalPrice: finalPrice,
            providerAmount: finalProviderAmt,
            extendedDurationHours: 0,
            extendedTotalPrice: 0,
            extensionStatus: 'ACCEPTED'
          }), 3000).catch(e => console.warn("Could not save accepted extension in Firestore", e));
        } else {
          executeWithTimeout(updateDoc(missionRef, {
            extendedDurationHours: 0,
            extendedTotalPrice: 0,
            extensionStatus: 'REJECTED'
          }), 3000).catch(e => console.warn("Could not save rejected extension in Firestore", e));
        }
      }
    }
  };

  if (!currentUser) {
    return <Auth users={users} onLogin={handleLogin} onRegister={handleRegister} onResetPassword={handleResetPassword} />;
  }

  // Admin gets its own full-screen layout — outside of the mobile Layout wrapper
  if (currentUser.role === UserRole.ADMIN) {
    return (
      <AdminDashboard
        currentUser={currentUser}
        missions={missions}
        users={users}
        transactions={transactions}
        baseRates={BASE_RATES}
        commissionRate={COMMISSION_RATE}
        onResolveDispute={handleResolveDispute}
        onVerifyUser={handleVerifyUser}
        onUpdateSettings={() => {}}
        onAddAdmin={(u) => handleRegister(u)}
        onDeleteUser={(id) => {
          setUsers(prev => prev.filter(u => u.id !== id));
          if (db) executeWithTimeout(deleteDoc(doc(db, "users", id)), 3000)
            .catch(e => console.warn("Could not delete user from Firestore:", e));
        }}
        onUpdateUser={handleAdminUpdateUser}
        onUpdateMissionStatus={handleUpdateMissionStatus}
        onDeleteMission={(id) => {
          setMissions(prev => prev.filter(m => m.id !== id));
          if (db) executeWithTimeout(deleteDoc(doc(db, "missions", id)), 3000)
            .catch(e => console.warn("Could not delete mission from Firestore:", e));
        }}
        onApproveWithdrawal={(txId) => {
          setTransactions(prev => prev.map(t =>
            t.id === txId ? { ...t, status: 'SUCCESS' } : t
          ));
          if (db) executeWithTimeout(updateDoc(doc(db, "transactions", txId), { status: 'SUCCESS' }), 3000)
            .catch(e => console.warn("Could not approve withdrawal in Firestore:", e));
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Layout
      currentUser={currentUser}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {currentUser.role === UserRole.CLIENT && (
        <ClientDashboard 
          currentUser={currentUser}
          missions={missions}
          onAddMission={handleAddMission}
          onValidateMission={(id) => handleUpdateMissionStatus(id, MissionStatus.COMPLETED)}
          onDisputeMission={(id, r) => handleUpdateMissionStatus(id, MissionStatus.DISPUTED)}
          onRateMission={handleRateMission}
          baseRates={BASE_RATES}
          commissionRate={COMMISSION_RATE}
          onUpdateUser={handleUpdateUser}
          onAddBonus={handleUpdateMissionBonus}
          onExtendDuration={handleExtendDuration}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {currentUser.role === UserRole.PROVIDER && (
        <ProviderDashboard 
          currentUser={currentUser}
          missions={missions}
          users={users}
          transactions={transactions}
          onUpdateMissionStatus={handleUpdateMissionStatus}
          onDisputeMission={(id, r) => handleUpdateMissionStatus(id, MissionStatus.DISPUTED)}
          onRateClient={handleRateClient}
          onUpdateUser={handleUpdateUser}
          onRequestWithdrawal={async (amount, method, phone) => {
            try {
              await requestProviderWithdrawal({
                userId: currentUser.id,
                amount,
                operator: method,
                phone,
              });
              // Debit wallet immediately (Cloud Function creates the Firestore transaction)
              setUsers(prev => prev.map(u =>
                u.id === currentUser.id
                  ? { ...u, walletBalance: Math.max(0, (u.walletBalance || 0) - amount) }
                  : u
              ));
              if (currentUser) {
                setCurrentUser(prev => prev ? { ...prev, walletBalance: Math.max(0, (prev.walletBalance || 0) - amount) } : null);
              }
            } catch (err: any) {
              // Cloud Function unavailable — fall back to local payout
              console.warn("Jèko withdrawal failed, using local fallback:", err.message);
              handlePayout(currentUser.id, amount);
            }
          }}
          onAnswerExtension={handleAnswerExtension}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

    </Layout>
  );
};

export default App;
