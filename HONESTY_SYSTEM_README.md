# 🏆 Honesty Score & Reward System - Complete Documentation

## Overview

The Honesty Score & Reward System is a gamified reputation system designed to motivate users to report lost and found items and return them to the admin office instead of keeping them. This system implements a comprehensive trust-based verification workflow with automatic badge assignment and leaderboard rankings.

---

## 🎯 Core Features

### 1. **Honesty Score System**
Users earn points through a multi-step verification process, NOT immediately upon reporting:

- **Starting Score**: 0 points for new users
- **Badge Assignment**: Automatic based on score thresholds
- **Score History**: Track all point awards and rejections
- **Security**: Points controlled entirely from backend to prevent manipulation

### 2. **Badge Levels**

| Badge | Score Range | Color | Icon |
|-------|------------|-------|------|
| 🟢 Beginner Helper | 0-20 | Green | 🟢 |
| 🟠 Trusted Contributor | 21-50 | Orange | 🟠 |
| 🟣 Campus Guardian | 51-100 | Purple | 🟣 |
| 🔵 Platinum Honest User | 100+ | Blue | 🔵 |

### 3. **Reward Points System**

Points are awarded based on item value:

| Item Value | Points |
|-----------|--------|
| Normal Item | 10 pts |
| Valuable Item | 20 pts |
| Critical/Important Item | 30 pts |

---

## 📊 Score Flow Logic (Step-by-Step)

### **Step 1: User Reports Found Item**
User submits found item with:
- Item image
- Item title
- Description
- Found location
- Date/time found

**Status**: `Pending` (No points awarded yet)

### **Step 2: Admin Reviews Report**
Admin accesses `/admin-verification.html` to:
- View all pending reports
- Review item photos and details
- Confirm physical submission to admin office
- Choose item value level
- Add verification notes

### **Step 3: Admin Verification Decision**

#### ✅ **APPROVE**: Item Verified
- Report status changes to `Verified`
- Physical submission confirmed
- Lost-item match approved (if applicable)
- User receives honesty points immediately
- Badge updates automatically if threshold reached
- Entry added to user's score history

#### ❌ **REJECT**: Report Rejected
- Report status changes to `Rejected`
- No points awarded
- Rejection reason logged
- Notification can be sent to user

### **Step 4: User Benefits**
- Honesty score increases
- Badge updates (if score reaches threshold)
- Total returned items counter increments
- Appears on leaderboard
- Score history maintained for transparency

---

## 🚀 How to Use

### **For Regular Users**

#### 1. Report a Found Item
- Navigate to "Report Found" page
- Fill in all required details (title, description, location, date)
- Upload clear photo of item
- Submit report
- **Note**: No points awarded yet - waiting for admin verification

#### 2. View Your Honesty Profile
- Click "My Account" in navigation
- Scroll to "Your Honesty Profile" section
- See:
  - Current honesty score
  - Current badge
  - Total items returned
  - Progress bar to next badge level

#### 3. Check the Leaderboard
- Navigate to `/leaderboard.html`
- View global rankings by honesty score
- Filter by:
  - Global Leaderboard (all users)
  - Top Users This Month
  - Platinum Users
  - Campus Guardians
  - Trusted Contributors
- See statistics:
  - Total users on leaderboard
  - Total points awarded
  - Badge distribution

### **For Admin Users**

#### 1. Access Verification Panel
- Go to `/admin-verification.html`
- Requires admin authentication token
- View all pending verifications

#### 2. Review Pending Items
The panel shows:
- Item photo and details
- Reporter information and current score
- Matched lost item (if any)
- Verification form

#### 3. Verify or Reject Items
For each pending item:

**To Approve**:
1. Select item value (Normal/Valuable/Critical)
2. Check "Item physically submitted" if confirmed
3. Add verification notes (optional)
4. Click "Approve & Award Score"
5. Points automatically awarded to user

**To Reject**:
1. Click "Reject Report"
2. Enter rejection reason
3. No points awarded
4. Report marked as "Rejected"

#### 4. View Statistics
Dashboard shows:
- Number of pending verifications
- Total verified today
- Total points awarded today

---

## 📱 User Interface Components

### **My Account Page Enhancements**
New section: "Your Honesty Profile"
- Score display (large, prominent)
- Current badge display
- Items returned counter
- Progress bar to next badge
- Link to leaderboard

### **Leaderboard Page** (`/leaderboard.html`)
Features:
- Ranked list of top users by honesty score
- Badge display for each user
- Multiple filter tabs
- User avatar/initials
- Statistics cards (total users, total points, verified reports)
- Monthly "Top Users" view
- Badge-specific leaderboards
- Responsive design

### **Admin Verification Panel** (`/admin-verification.html`)
Features:
- Pending items list
- Item photos and details
- Reporter profile information
- Matched lost items display
- Verification form with:
  - Item value selector
  - Physical submission checkbox
  - Verification notes field
- Approve/Reject buttons
- Success/error notifications
- Auto-refresh every 30 seconds

---

## 🔐 Security & Anti-Abuse Measures

### **Backend-Controlled Score**
- ❌ Frontend cannot modify scores
- ✅ Only admin can approve and award points
- ✅ All transactions logged in score history

### **Duplicate Prevention**
- Each found item can only be verified once
- `rewardGranted` flag prevents double-awarding
- Status tracking prevents re-verification

### **Verification Requirements**
- Points only awarded after admin verification
- Admin must confirm physical submission
- Lost-item match must be approved
- Rejection prevents any point award

### **Audit Trail**
- Complete score history stored per user
- Timestamps on all actions
- Admin ID recorded for each verification
- Rejection reasons logged

---

## 💾 Database Schema

### **User Model Updates**
```javascript
{
  // ... existing fields ...
  honestyScore: Number,           // 0 by default
  currentBadge: String,           // "Beginner Helper" by default
  totalReturnedItems: Number,     // 0 by default
  scoreHistory: [{
    date: Date,
    action: String,               // "report_verified", "report_rejected"
    pointsAwarded: Number,
    foundItemId: ObjectId,
    description: String
  }]
}
```

### **FoundItem Model Updates**
```javascript
{
  // ... existing fields ...
  reportedByUserId: ObjectId,     // User who reported
  verificationStatus: String,     // "Pending", "Verified", "Claimed", "Rejected"
  physicallySubmitted: Boolean,   // Confirmed by admin
  matchedLostItem: ObjectId,      // Ref to LostItem if matched
  rewardGranted: Boolean,         // Prevents double-awarding
  adminVerificationNotes: String, // Admin's verification notes
  verifiedBy: ObjectId,           // Admin who verified
  verifiedAt: Date,               // When verified
  rejectionReason: String         // If rejected, why
}
```

---

## 🔌 API Endpoints

### **Admin Endpoints** (Require admin authentication)

#### Get Pending Verifications
```
GET /api/honesty/admin/pending
Headers: Authorization: Bearer {token}
Response: { count: number, items: [...] }
```

#### Verify Found Item (Award Score)
```
PUT /api/honesty/admin/verify/:foundItemId
Body: {
  adminNotes: string,
  physicallySubmitted: boolean,
  itemValue: "normal" | "valuable" | "critical"
}
Response: { scoreUpdate: { user, newScore, pointsAwarded, newBadge } }
```

#### Reject Found Item
```
PUT /api/honesty/admin/reject/:foundItemId
Body: { rejectionReason: string }
Response: { message, foundItem }
```

### **User Endpoints** (Public/Protected)

#### Get User Honesty Profile
```
GET /api/honesty/profile/:userId
Response: {
  user: { honestyScore, currentBadge, totalReturnedItems, ... },
  badgeProgress: { currentBadge, currentScore, nextBadgeRequiredScore, progressPercentage }
}
```

#### Get Global Leaderboard
```
GET /api/honesty/leaderboard?limit=50&sortBy=honestyScore
Response: { totalUsers, leaderboard: [...] }
```

#### Get Leaderboard by Badge
```
GET /api/honesty/leaderboard/badge/:badge
Response: { badge, count, users: [...] }
```

#### Get Top Users of Month
```
GET /api/honesty/leaderboard/month/top
Response: { month, topUsers: [...] }
```

#### Get Badge Statistics
```
GET /api/honesty/stats/badges
Response: {
  totalUsers,
  totalHonestyScore,
  badgeDistribution: { "Beginner Helper": count, ... }
}
```

---

## 🎨 Frontend Integration

### **Route Updates in `app.js`**
```javascript
const honestyRoutes = require("./routes/honestyRoutes");
app.use("/api/honesty", honestyRoutes);
```

### **New Files Created**
- `/leaderboard.html` - Global leaderboard page
- `/admin-verification.html` - Admin verification panel
- Updated `/my-account.html` - Adds honesty profile section

### **Updated Files**
- `/backend/controllers/honestyController.js` - All honesty score logic
- `/backend/routes/honestyRoutes.js` - All endpoints
- `/backend/models/User.js` - Honesty score fields
- `/backend/models/FoundItem.js` - Verification fields
- `/backend/controllers/foundController.js` - Track user ID on report
- `/script.js` - Honesty profile loading on account page
- `/backend/app.js` - Mount honesty routes

---

## 📈 Gamification & Motivation

### **Why This Works**
1. **Deferred Reward**: Users can't game the system by fake reporting
2. **Transparency**: Score history shows exactly how/when points earned
3. **Status Symbols**: Badges provide visible achievement recognition
4. **Social Proof**: Public leaderboard encourages honest behavior
5. **Progression**: Clear path to higher badges motivates users
6. **Monthly Highlights**: "Top Users of Month" provides recurring goals

### **User Psychology**
- ✅ Clear reward structure
- ✅ Achievement milestones (badges)
- ✅ Social comparison (leaderboard)
- ✅ Progress visualization (progress bar)
- ✅ Transparent scoring (history log)

---

## 🔄 Workflow Examples

### **Example 1: Happy Path (Item Verified)**
```
1. User finds wallet with ID card
   → Reports on "Report Found" page
   → Status: "Pending"
   → Score: 0 (no reward yet)

2. User brings wallet to admin office
   → Admin logs into verification panel
   → Reviews item details and photo
   → Confirms physical submission
   → Selects "Valuable" (20 points)
   → Clicks "Approve"

3. System automatically:
   → Updates report status to "Verified"
   → Sets rewardGranted = true
   → Adds 20 points to user's honestyScore (now 20 total)
   → Updates badge to "Trusted Contributor" (21-50)
   → Increments totalReturnedItems to 1
   → Logs transaction in scoreHistory

4. User sees on next login:
   → My Account page shows: Score 20, Badge "Trusted Contributor"
   → Progress bar shows progress toward "Campus Guardian" (51 pts)
   → Appears on leaderboard ranked by score
```

### **Example 2: Rejection Path (Suspicious Report)**
```
1. User reports suspicious "found item" that doesn't exist
   → Status: "Pending"
   → Score: 0

2. Admin reviews:
   → Photo is blurry/fake
   → Description suspicious
   → Clicks "Reject Report"
   → Enters reason: "Suspicious report, no matching lost item"

3. System automatically:
   → Sets status to "Rejected"
   → Sets rewardGranted = false
   → NO points added
   → Logs rejection in user's scoreHistory
   → User receives no badge update

4. Result:
   → User's honesty score remains unchanged
   → Report marked as rejected
   → Admin can track patterns of abuse
```

---

## ⚙️ Configuration & Customization

### **Adjusting Point Values**
In `/backend/controllers/honestyController.js`:
```javascript
const calculateRewardPoints = (itemValue = "normal") => {
    const rewards = {
        "normal": 10,      // Adjust here
        "valuable": 20,
        "critical": 30
    };
    return rewards[itemValue] || 10;
};
```

### **Adjusting Badge Thresholds**
In `/backend/controllers/honestyController.js`:
```javascript
const getBadgeFromScore = (score) => {
    if (score < 21) return "Beginner Helper";
    if (score < 51) return "Trusted Contributor";    // Adjust 51
    if (score < 101) return "Campus Guardian";        // Adjust 101
    return "Platinum Honest User";
};
```

### **Color Scheme**
Modify badge colors in CSS files:
- `.badge.beginner` - Light blue
- `.badge.trusted` - Orange
- `.badge.guardian` - Purple
- `.badge.platinum` - Cyan

---

## 🧪 Testing the System

### **Test Case 1: Report and Verify**
1. Create test account
2. Report found item with image
3. Login as admin
4. Verify the item (award 10 pts)
5. Check user's honesty profile - should show 10 pts
6. Verify appears on leaderboard

### **Test Case 2: Reject Report**
1. Report suspicious found item
2. Admin rejects with reason
3. Check user's score history - should show rejection
4. User's score should not change

### **Test Case 3: Badge Progression**
1. Approve 3 normal items (30 pts total)
2. User should be in "Trusted Contributor" (21-50)
3. Approve 2 more (10 pts) to reach 40 pts
4. Badge should still be "Trusted Contributor"
5. Approve 1 valuable (20 pts) to reach 60 pts
6. Badge should auto-update to "Campus Guardian"

### **Test Case 4: Monthly Leaderboard**
1. Verify items from multiple users
2. Visit `/leaderboard.html`
3. Click "Top This Month" tab
4. Should show only items verified in current month

---

## 📊 Monitoring & Analytics

### **Admin Dashboard Metrics** (Can be added later)
- Daily/weekly/monthly verification rates
- Average score per verified item
- Most active reporters
- Badge distribution over time
- Rejection rates by category

### **User Analytics** (Can be added later)
- User journey analysis
- Badge milestone tracking
- Retention impact of gamification
- Item return rate improvements

---

## 🚨 Troubleshooting

### **Score Not Updating After Approval**
- Check if token has admin role
- Verify `rewardGranted` is false before approving
- Check network tab in browser dev tools

### **Badge Not Updating**
- Verify score calculation is correct
- Check badge threshold values
- Clear browser cache
- Reload profile page

### **Leaderboard Not Showing Users**
- Ensure users have verified reports
- Check API response in browser console
- Verify `/api/honesty/leaderboard` endpoint is accessible

### **Admin Panel Shows No Pending Items**
- Refresh page
- Check if items are still in "Pending" status
- Verify admin authentication token

---

## 🎓 Best Practices

### **For Admins**
1. ✅ Verify items promptly (within 24 hours)
2. ✅ Add detailed notes for rejected items
3. ✅ Confirm physical submission before approval
4. ✅ Review score history for patterns
5. ✅ Monitor for abuse (multiple rejections from same user)

### **For Users**
1. ✅ Report items honestly with clear photos
2. ✅ Provide detailed descriptions
3. ✅ Bring items to admin office for verification
4. ✅ Check leaderboard to see progress
5. ✅ Celebrate badge achievements

### **For Developers**
1. ✅ Keep score logic in backend only
2. ✅ Audit all verification requests
3. ✅ Monitor API performance under load
4. ✅ Back up score history regularly
5. ✅ Test all edge cases before production

---

## 📝 Future Enhancements (Optional)

1. **Achievement Notifications**
   - Push notifications when badge earned
   - Milestone emails ("You're 5 points away from next badge!")

2. **Advanced Filtering**
   - Department-based leaderboards
   - Time-period filtering (weekly, monthly)
   - Category-specific rankings

3. **Social Features**
   - User profiles with achievement history
   - "Share achievement" buttons
   - User following/comparison

4. **Admin Reports**
   - CSV export of verification data
   - Fraud detection patterns
   - Performance metrics by admin

5. **Mobile App**
   - Native mobile verification panel
   - Push notifications
   - Offline support

6. **Integration with Existing Features**
   - Show badge on match requests
   - Trust score affects matching algorithm
   - Special rewards for high-value returns

---

## 📞 Support & Questions

For issues or feature requests:
1. Check troubleshooting section above
2. Review API documentation
3. Test with provided test cases
4. Check browser console for errors
5. Review backend logs

---

**Version**: 1.0  
**Last Updated**: 2025-01-13  
**Status**: Production Ready ✅
