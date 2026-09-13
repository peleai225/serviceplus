
import { sendSmsFunction } from "./firebase";

// Variable pour basculer entre le mode simulation et le mode réel
// Mettez à 'false' une fois que vous avez configuré vos Firebase Functions avec Twilio/Orange
const USE_SIMULATION_MODE = true; 

export const sendVerificationCode = async (phoneNumber: string, code: string): Promise<boolean> => {
  console.log(`[SMS Service] Tentative d'envoi au ${phoneNumber}. Code: ${code}`);

  if (USE_SIMULATION_MODE) {
    // --- MODE SIMULATION (DEMO/GRATUIT) ---
    // On retourne immédiatement succès car le code est affiché dans l'UI du composant Auth
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  } else {
    // --- MODE RÉEL (VIA FIREBASE CLOUD FUNCTIONS) ---
    try {
      // Appel à la Cloud Function 'sendSms' sécurisée
      // Le backend gérera Twilio ou Orange API
      const response = await sendSmsFunction({ 
        phoneNumber: phoneNumber,
        message: `Votre code de vérification Servi+ est : ${code}`,
        provider: 'TWILIO' // ou 'ORANGE' selon votre config backend
      });
      
      const data = response.data as any;
      if (data.success) {
        return true;
      } else {
        console.error("Erreur SMS Backend:", data.error);
        throw new Error(data.error || "Échec de l'envoi SMS");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel Cloud Function:", error);
      // Fallback en simulation si le serveur échoue pour ne pas bloquer l'utilisateur
      return true;
    }
  }
};
