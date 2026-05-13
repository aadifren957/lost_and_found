# Honesty Score System - Technical Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────┤
│ leaderboard.html │ admin-verification.html │ my-account.html│
│ (Leaderboard UI) │ (Admin Panel)           │ (Profile UI)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ (REST API Calls)
┌──────────────────────────┴──────────────────────────────────┐
│                    API LAYER (/api/honesty)                │
├─────────────────────────────────────────────────────────────┤
│ Admin Routes          │  Public Routes                       │
│ /admin/pending        │  /profile/:userId                   │
│ /admin/verify/:id     │  /leaderboard                       │
│ /admin/reject/:id     │  /leaderboard/badge/:badge          │
│                       │  /leaderboard/month/top             │
│                       │  /stats/badges                      │
└──────────────────────┬────────────────────────────────────┘
                       │ (Business Logic)
┌──────────────────────┴────────────────────────────────────┐
│              CONTROLLER LAYER (honestyController.js)      │
├────────────────────────────────────────────────────────────┤
│ • getPendingVerifications()                               │
│ • verifyFoundItem() → Award Score → Update Badge         │
│ • rejectFoundItem() → No Points                           │
│ • getUserHonestyProfile()                                │
│ • getLeaderboard()                                        │
│ • getLeaderboardByBadge()                                 │
│ • getTopUsersOfMonth()                                    │
│ • getBadgeStatistics()                                    │
└──────────────────────┬────────────────────────────────────┘
                       │ (Data Operations)
┌──────────────────────┴────────────────────────────────────┐
│               DATA LAYER (Models & MongoDB)               │
├────────────────────────────────────────────────────────────┤
│ User Collection          │  FoundItem Collection           │
│ • honestyScore           │  • verificationStatus           │
│ • currentBadge           │  • reportedByUserId             │
│ • totalReturnedItems     │  • rewardGranted                │
│ • scoreHistory[]         │  • matchedLostItem              │
│                          │  • physicallySubmitted          │
│                          │  • verifiedBy / verifiedAt      │
│                          │  • adminVerificationNotes       │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Verification & Scoring

### Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER REPORTS FOUND ITEM                                 │
├─────────────────────────────────────────────────────────────┤
│ POST /api/found/report                                      │
│ {                                                           │
│   title, description, category,                            │
│   location, date, image (multipart)                        │
│ }                                                           │
│                                                             │
│ foundController.js → reportFoundItem()                      │
│ • Extract user ID from JWT token                           │
│ • Create FoundItem with:                                   │
│   - reportedByUserId: req.user.id                          │
│   - verificationStatus: "Pending"                          │
│   - rewardGranted: false                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ADMIN REVIEWS PENDING ITEMS                             │
├─────────────────────────────────────────────────────────────┤
│ GET /api/honesty/admin/pending                             │
│                                                             │
│ honestyController.js → getPendingVerifications()           │
│ • Query FoundItems with verificationStatus: "Pending"      │
│ • Populate reporter (User) info                            │
│ • Populate matched lost item                               │
│ • Return sorted list                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴───────────┐
        │                        │
        ▼                        ▼
  ┌──────────────┐        ┌──────────────┐
  │ 3A. APPROVE  │        │ 3B. REJECT   │
  └──────┬───────┘        └──────┬───────┘
         │                       │
         ▼                       ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ verifyFoundItem()│  │ rejectFoundItem()│
   │ PUT /verify/:id  │  │ PUT /reject/:id  │
   └────────┬─────────┘  └────────┬─────────┘
            │                     │
            ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ Update FoundItem:│  │ Update FoundItem:│
   │ status: Verified │  │ status: Rejected │
   │ rewardGranted: ✓ │  │ rewardGranted: ✗ │
   │ verifiedBy: admin│  │ verifiedBy: admin│
   │ verifiedAt: NOW  │  │ verifiedAt: NOW  │
   │ notes: "..."     │  │ reason: "..."    │
   └────────┬─────────┘  └────────┬─────────┘
            │                     │
            ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ AWARD SCORE ✅   │  │ NO SCORE ❌      │
   │                  │  │                  │
   │ Get User         │  │ Log in history   │
   │ Add points       │  │ action: rejected │
   │ Update badge     │  │ points: 0        │
   │ Update returned  │  │                  │
   │ items counter    │  │ End              │
   │ Log in history   │  └──────────────────┘
   │                  │
   │ action: verified │
   │ points: awarded  │
   │ badge: updated   │
   │                  │
   │ Respond with ✓   │
   └──────────────────┘
```

---

## Code Implementation Details

### 1. Verification Function (honestyController.js)

```javascript
exports.verifyFoundItem = async (req, res) => {
    // 1. VALIDATE
    const foundItem = await FoundItem.findById(foundItemId)
        .populate("reportedByUserId");
    
    if (foundItem.rewardGranted) {
        return res.status(400).json({ 
            message: "Reward already granted" 
        });
    }

    // 2. UPDATE FOUND ITEM
    foundItem.verificationStatus = "Verified";
    foundItem.physicallySubmitted = physicallySubmitted;
    foundItem.adminVerificationNotes = adminNotes;
    foundItem.verifiedBy = req.user.id;      // Admin ID
    foundItem.verifiedAt = new Date();
    foundItem.rewardGranted = true;           // Prevent double-award
    foundItem.status = "returned";

    await foundItem.save();

    // 3. AWARD SCORE TO USER
    const user = foundItem.reportedByUserId;
    const pointsAwarded = calculateRewardPoints(itemValue);
    
    // Add points
    user.honestyScore += pointsAwarded;
    user.totalReturnedItems += 1;

    // Update badge automatically
    const newBadge = getBadgeFromScore(user.honestyScore);
    user.currentBadge = newBadge;

    // Log transaction
    user.scoreHistory.push({
        date: new Date(),
        action: "report_verified",
        pointsAwarded: pointsAwarded,
        foundItemId: foundItemId,
        description: `Verified: ${foundItem.title}`
    });

    await user.save();

    // 4. RESPOND
    return res.json({
        message: "Found item verified. Score awarded!",
        scoreUpdate: {
            user: user.name,
            newScore: user.honestyScore,
            pointsAwarded: pointsAwarded,
            newBadge: newBadge
        }
    });
};
```

### 2. Badge Assignment Logic

```javascript
const getBadgeFromScore = (score) => {
    // Score ranges create natural progression
    if (score < 21) return "Beginner Helper";      // 0-20
    if (score < 51) return "Trusted Contributor"; // 21-50
    if (score < 101) return "Campus Guardian";    // 51-100
    return "Platinum Honest User";                // 100+
};

// When score updated:
// 0 → 10: Badge stays "Beginner Helper"
// 10 → 20: Badge stays "Beginner Helper"
// 20 → 30: Badge updates to "Trusted Contributor" ✨
// 50 → 60: Badge updates to "Campus Guardian" ✨
// 100 → 130: Badge updates to "Platinum Honest User" ✨
```

### 3. Leaderboard Query

```javascript
exports.getLeaderboard = async (req, res) => {
    const { limit = 50, sortBy = "honestyScore" } = req.query;

    // Query users sorted by score descending
    const leaderboard = await User
        .find({ role: "user" })
        .select("name email honestyScore currentBadge totalReturnedItems profilePic")
        .sort({ [sortBy]: -1 })           // Sort descending
        .limit(parseInt(limit));

    // Add rank number
    const rankedLeaderboard = leaderboard.map((user, index) => ({
        ...user.toObject(),
        rank: index + 1                   // Rank = position + 1
    }));

    res.json({
        totalUsers: rankedLeaderboard.length,
        leaderboard: rankedLeaderboard
    });
};
```

### 4. Monthly Top Users Calculation

```javascript
exports.getTopUsersOfMonth = async (req, res) => {
    // Get first day of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const users = await User.find({ role: "user" });

    // Calculate monthly score from scoreHistory
    const monthlyScores = users.map(user => {
        const monthlyPoints = user.scoreHistory
            .filter(record => new Date(record.date) >= startOfMonth)
            .reduce((total, record) => total + record.pointsAwarded, 0);

        return {
            name: user.name,
            totalScore: user.honestyScore,    // Lifetime score
            monthlyScore: monthlyPoints       // This month only
        };
    }).filter(u => u.monthlyScore > 0)      // Only users with this month's points
     .sort((a, b) => b.monthlyScore - a.monthlyScore)
     .slice(0, 10);

    res.json({
        month: new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        }),
        topUsers: rankedUsers
    });
};
```

---

## Frontend Integration Points

### 1. Leaderboard Page Flow

```javascript
// leaderboard.html
async function loadLeaderboard() {
    // User selects tab
    const tab = "global"; // or "monthly", "platinum", etc.

    // Build URL based on tab
    const url = tab === "global" 
        ? "/api/honesty/leaderboard"
        : `/api/honesty/leaderboard/badge/${badge}`;

    // Fetch data
    const response = await fetch(url);
    const data = await response.json();

    // Transform to UI
    const users = data.leaderboard;
    users.forEach((user, index) => {
        // user.rank = index + 1
        // Render HTML with badge color, score, rank medal
    });
}
```

### 2. My Account Honesty Profile Load

```javascript
// my-account.html (updated script.js)
async function loadHonestyProfile() {
    // Get user ID from profile endpoint
    const profile = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
    });
    const userId = profile._id;

    // Fetch honesty data
    const honesty = await fetch(`/api/honesty/profile/${userId}`);
    const data = honesty.json();

    // Show profile
    document.getElementById("userScore").text = data.user.honestyScore;
    document.getElementById("userBadge").text = data.user.currentBadge;
    
    // Update progress bar
    const progress = data.badgeProgress.progressPercentage;
    document.getElementById("progressBar").style.width = progress + "%";
}
```

### 3. Admin Verification Panel

```javascript
// admin-verification.html
async function approveItem(itemId) {
    // Collect form data
    const itemValue = document.getElementById("itemValue").value;
    const physicallySubmitted = document.getElementById("submitted").checked;
    const notes = document.getElementById("notes").value;

    // Send to backend
    const response = await fetch(
        `/api/honesty/admin/verify/${itemId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                itemValue,
                physicallySubmitted,
                adminNotes: notes
            })
        }
    );

    // Show result with points awarded
    const result = response.json();
    showAlert(`✓ ${result.scoreUpdate.pointsAwarded} pts awarded!`);
}
```

---

## Security Considerations

### 1. Score Manipulation Prevention

```
❌ UNSAFE: Frontend calculates score
✅ SAFE: Backend only calculates and updates score

// Backend only:
user.honestyScore += calculateRewardPoints(itemValue);

// NOT accessible from frontend
```

### 2. Double-Award Prevention

```javascript
// Before awarding
if (foundItem.rewardGranted) {
    throw new Error("Already rewarded");
}

// After awarding
foundItem.rewardGranted = true;  // Lock it
```

### 3. Rejection Handling

```javascript
// Rejection doesn't award points, but logs it
user.scoreHistory.push({
    action: "report_rejected",
    pointsAwarded: 0,              // No points
    description: rejectionReason
});
// This creates audit trail without giving points
```

### 4. Admin Authentication

```javascript
// Only admins can verify
router.put("/admin/verify/:id", protect, adminOnly, verifyFoundItem);
//                                        ^^^^^^^^^ checks role === "admin"
```

---

## Performance Considerations

### 1. Leaderboard Query Optimization

```javascript
// Bad (loads all users):
const users = await User.find();

// Good (select needed fields only):
const users = await User
    .find({ role: "user" })
    .select("name honestyScore currentBadge totalReturnedItems")
    .sort({ honestyScore: -1 })
    .limit(50);

// Even better (add index):
// db.users.createIndex({ honestyScore: -1 })
```

### 2. Score History Size

```javascript
// Score history grows over time
// Mitigation: Archive old entries or aggregate stats

// Keep recent 100 entries per user:
if (user.scoreHistory.length > 100) {
    user.scoreHistory = user.scoreHistory.slice(-100);
}
```

### 3. Badge Recalculation

```javascript
// Don't recalculate on every query
// Instead, store current badge in User model

// Update only on:
// 1. New verification
// 2. Admin override
// NOT on every profile fetch
```

---

## Testing Strategy

### Unit Tests (Controllers)

```javascript
describe("honestyController", () => {
    describe("verifyFoundItem", () => {
        it("should award points and update badge", async () => {
            // Setup
            const user = await User.create({ honestyScore: 0 });
            const item = await FoundItem.create({ 
                reportedByUserId: user._id,
                rewardGranted: false
            });

            // Execute
            await verifyFoundItem(item._id, { itemValue: "normal" });

            // Verify
            const updatedUser = await User.findById(user._id);
            assert.equal(updatedUser.honestyScore, 10);
            assert.equal(updatedUser.currentBadge, "Beginner Helper");
        });

        it("should prevent double-award", async () => {
            // Setup with already awarded item
            const item = await FoundItem.create({ 
                rewardGranted: true
            });

            // Execute - should fail
            await assert.rejects(
                () => verifyFoundItem(item._id),
                /already granted/
            );
        });
    });
});
```

### Integration Tests

```javascript
describe("Honesty System Integration", () => {
    it("should complete full workflow", async () => {
        // 1. User reports item
        const report = await post("/api/found/report", reportData);
        assert.equal(report.verificationStatus, "Pending");

        // 2. Admin verifies
        const verify = await put(
            `/api/honesty/admin/verify/${report._id}`,
            { itemValue: "valuable" }
        );

        // 3. User score updated
        const user = await User.findById(report.reportedByUserId);
        assert.equal(user.honestyScore, 20);
        assert.equal(user.currentBadge, "Beginner Helper");

        // 4. Appears on leaderboard
        const leaderboard = await get("/api/honesty/leaderboard");
        assert(leaderboard.some(u => u._id === user._id));
    });
});
```

---

## Deployment Checklist

- [ ] Update User model in database
- [ ] Update FoundItem model in database  
- [ ] Create honestyController.js
- [ ] Create honestyRoutes.js
- [ ] Update app.js with routes
- [ ] Update foundController.js
- [ ] Create leaderboard.html
- [ ] Create admin-verification.html
- [ ] Update my-account.html
- [ ] Update script.js with honesty profile loading
- [ ] Create MongoDB indexes on frequently queried fields
- [ ] Test all endpoints
- [ ] Add error handling
- [ ] Configure CORS if needed
- [ ] Test with production data volume
- [ ] Document API changes
- [ ] Train admin users
- [ ] Monitor system performance
- [ ] Create backup of database before deployment

---

## Monitoring & Maintenance

### Key Metrics to Track
- Average verification time
- Approval vs rejection rate
- Points awarded per day
- Badge distribution changes
- Leaderboard update frequency
- API response times

### Regular Maintenance
- Archive old scoreHistory entries (quarterly)
- Verify data integrity (monthly)
- Check for abuse patterns (weekly)
- Update documentation (as needed)
- Review and optimize queries (quarterly)

---

**This technical reference covers the complete implementation. Refer back as needed during maintenance and updates.**
