# 🚀 Mascota Saltana - Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [x] All code reviewed and approved
- [x] TypeScript types properly defined
- [x] No security vulnerabilities (CodeQL passed)
- [x] All review comments addressed

### 2. Testing
- [x] Components load without errors
- [x] Actions properly configured
- [x] Database schema validated
- [ ] Manual testing in staging/production

### 3. Documentation
- [x] Feature documentation complete (`docs/MASCOTA_SALTANA.md`)
- [x] Implementation summary created
- [x] API endpoints documented
- [x] Troubleshooting guide included

## Deployment Steps

### Step 1: Database Migration
```bash
# Run database migration
npm run db:migrate

# Verify migration applied
# Check that tables exist: pets, pet_houses, pet_items, etc.
```

**Expected Result**: 7 new tables created with proper relations

### Step 2: Seed Initial Items
Choose one method:

**Option A: Via Script**
```bash
npm run tsx src/db/seed-pet-items.ts
```

**Option B: Via API**
```bash
curl -X POST https://your-domain.com/api/pet-items/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_CRON_SECRET"}'
```

**Verify Seeding**
```bash
curl https://your-domain.com/api/pet-items/seed
# Should return: {"itemsCount": 19, "seeded": true}
```

**Expected Result**: 19 items created in pet_items table

### Step 3: Configure Cron Job
Set up a cron job to update pet stats regularly.

**Recommended Schedule**: Every 1-6 hours

**Cron Configuration Example** (e.g., using Vercel Cron or external service):
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 */3 * * *",
      "method": "POST",
      "body": {
        "secret": "YOUR_CRON_SECRET",
        "task": "update-pet-stats"
      }
    }
  ]
}
```

**Manual Test**:
```bash
curl -X POST https://your-domain.com/api/cron \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_CRON_SECRET", "task": "update-pet-stats"}'
```

**Expected Result**: `OK` response, stats updated for all pets

### Step 4: Deploy Application
```bash
# Standard deployment process
git push origin main  # or your deployment branch

# Vercel will automatically deploy
# OR use your deployment method
```

**Expected Result**: Application deploys successfully

### Step 5: Verify Deployment

#### Check Pages
- [ ] `/mascota` - Main pet page loads
- [ ] `/mascota/tienda` - Shop displays items
- [ ] `/mascota/inventario` - Inventory page loads
- [ ] `/mascota/juegos` - Games page loads
- [ ] `/mascota/juegos/coin-clicker` - Game is playable

#### Check Functionality
- [ ] Pet is created automatically on first visit
- [ ] Stats display correctly
- [ ] Feed/Clean/Sleep actions work
- [ ] Items can be purchased from shop
- [ ] Inventory updates after purchase
- [ ] Food items can be used
- [ ] Coin Clicker game is playable
- [ ] Coins are awarded after game
- [ ] Daily limits are enforced

#### Check Integration
- [ ] Purchases deduct Saltocoins
- [ ] Game rewards add Saltocoins
- [ ] Transactions appear in Banco Saltano
- [ ] User balance updates correctly

## Post-Deployment

### Monitoring

#### First 24 Hours
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Verify cron job execution
- [ ] Monitor Saltocoin transactions
- [ ] Check user feedback

#### First Week
- [ ] Review pet creation statistics
- [ ] Monitor shop purchase patterns
- [ ] Check minigame participation
- [ ] Verify economy balance
- [ ] Collect user feedback

### Performance Metrics to Track
1. **User Adoption**
   - Number of pets created
   - Daily active users
   - Average session time

2. **Economy**
   - Total Saltocoins spent
   - Most purchased items
   - Average earnings per user

3. **Engagement**
   - Games played per user
   - Actions per session
   - Return rate

4. **Technical**
   - Page load times
   - API response times
   - Error rates
   - Database query performance

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert the deployment
git revert HEAD~4..HEAD  # Revert last 4 commits
git push origin main

# OR use deployment platform rollback
# e.g., Vercel: Redeploy previous version from dashboard
```

### Database Rollback
```sql
-- Only if absolutely necessary
-- Backup data first!

DROP TABLE IF EXISTS pet_mini_game_limits CASCADE;
DROP TABLE IF EXISTS pet_mini_game_sessions CASCADE;
DROP TABLE IF EXISTS pet_visits CASCADE;
DROP TABLE IF EXISTS pet_inventory CASCADE;
DROP TABLE IF EXISTS pet_items CASCADE;
DROP TABLE IF EXISTS pet_houses CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TYPE IF EXISTS pet_stage CASCADE;
DROP TYPE IF EXISTS pet_item_type CASCADE;
```

⚠️ **Warning**: Database rollback will delete all pet data!

## Troubleshooting

### Issue: Items not appearing in shop
**Solution**: Run the seeding script or API endpoint

### Issue: Stats not degrading
**Solution**: 
1. Check cron job is configured
2. Manually trigger: `POST /api/cron` with `update-pet-stats` task
3. Stats update when user loads pet page

### Issue: Purchase errors
**Solution**:
1. Verify user has sufficient Saltocoins
2. Check Banco Saltano integration is working
3. Review transaction logs

### Issue: Daily limit not resetting
**Solution**: Limits reset based on timestamp, not actual calendar day. Check `last_play_date` in database.

## Security Checklist

- [x] CRON_SECRET is configured and secure
- [x] All endpoints require authentication
- [x] User input is validated
- [x] No SQL injection vulnerabilities
- [x] XSS protection in place
- [x] CSRF protection (via Astro)
- [x] Rate limiting considerations (daily game limits)

## Communication

### Announcement Template
```
🎉 Nueva Función: ¡Mascota Saltana!

Ya podés tener tu propia mascota virtual:
- Alimentala, limpiala y cuidala
- Comprá items en la tienda
- Jugá mini-juegos para ganar Saltocoins
- Visitá las mascotas de otros usuarios

¡Entrá ahora a /mascota y empezá a jugar!
```

### User Guide Points
1. How to access your pet (`/mascota`)
2. How to care for your pet (feed, clean, sleep)
3. How to earn Saltocoins (games, likes)
4. How to buy items (shop)
5. Daily limits (5 games per day)

## Success Criteria

### Week 1 Goals
- [ ] 50% of active users create a pet
- [ ] Average 3+ actions per user per session
- [ ] 20% of users purchase at least one item
- [ ] 30% of users play at least one game
- [ ] Less than 1% error rate

### Month 1 Goals
- [ ] 80% of active users have a pet
- [ ] Average 5+ actions per user per session
- [ ] 50% of users purchase items regularly
- [ ] Active daily game participation
- [ ] Positive user feedback

## Support Resources

- **Documentation**: `/docs/MASCOTA_SALTANA.md`
- **Implementation Summary**: `/IMPLEMENTATION_SUMMARY_MASCOTA.md`
- **Code Repository**: Check Git history for this PR
- **Database Schema**: Check migration `0046_white_rhodey.sql`

## Final Sign-Off

- [x] Code reviewed and approved
- [x] Security scan passed
- [x] Documentation complete
- [ ] Deployed to production
- [ ] Post-deployment verification complete
- [ ] Monitoring in place
- [ ] Team notified

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Verified By**: _____________

**Status**: ⏳ Pending → ✅ Complete

