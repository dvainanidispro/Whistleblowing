//////////////////////     IMPORTS     ///////////////////////////

import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import serviceAccount from './service-account.json' with {type: 'json'};

// Initialize Firebase Admin (if not already initialized)
const app = initializeApp({
    projectId: 'whistleblowing-app',
    appId: '1:430245849423:web:63820eef781768b28dbd3a',
    credential: admin.credential.cert(serviceAccount),
});
const auth = getAuth(app);


//////////////////////      USER      ///////////////////////////

const userEmail = 'vainanidis@computerstudio.gr';
const userDisplayName = 'ΔΗΜΗΤΡΗΣ ΒΑΪΝΑΝΙΔΗΣ';
const customClaims = {
    companyID: 'bkueHt76TQiUW7G8p1BK',
    appAdmin: true,
};


///////////////////    MAIN SCRIPT   ///////////////////////////

async function modifyUser() {
    try {

        console.log('🔍 Searching for user with email:', userEmail);
        
        // Get user by email
        let user;
        try {
            user = await auth.getUserByEmail(userEmail);
            console.log('✅ User found:', user.uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.error('❌ Error: User not found with email:', userEmail);
                console.error('   Please make sure the user exists before running this script.');
                process.exit(1);
            } else {
                throw error;
            }
        }

        // Update display name if provided and different
        if (user.displayName !== userDisplayName) {
            console.log('📝 Updating display name from:', user.displayName, 'to:', userDisplayName);
            await auth.updateUser(user.uid, {
                displayName: userDisplayName
            });
            console.log('✅ Display name updated successfully');
        }

        // Set custom claims
        console.log('🔐 Setting custom claims:', customClaims);
        await auth.setCustomUserClaims(user.uid, customClaims);
        console.log('✅ Custom claims set successfully');

        // Verify the changes
        const updatedUser = await auth.getUser(user.uid);
        console.log('\n📋 Final user details:');
        console.log('   UID:', updatedUser.uid);
        console.log('   Email:', updatedUser.email);
        console.log('   Display Name:', updatedUser.displayName);
        console.log('   Email Verified:', updatedUser.emailVerified);
        console.log('   Custom Claims:', updatedUser.customClaims);
        
        console.log('\n🎉 User modification completed successfully!');
        
    } catch (error) {
        console.error('❌ Error modifying user:', error.message);
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        process.exit(1);
    }
}

// Run the script
console.log('🚀 Starting user modification script...');
console.log('=====================================');
modifyUser().then(() => {
    console.log('=====================================');
    process.exit(0);
});

