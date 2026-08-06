const Target = require('../models/Target');
const Sale = require('../models/Sale');

// @desc    Get Current Month Target vs Actual Achievement Progress
// @route   GET /api/targets/current
const getCurrentTarget = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    // Find or create default target for current month
    let target = await Target.findOne({ month: monthStr });
    if (!target) {
      target = await Target.create({
        month: monthStr,
        targetCases: 5000,
        targetRevenue: 2500000
      });
    }

    // Month Date Boundaries (Local & UTC safe)
    const monthStart = new Date(year, now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const sales = await Sale.find({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });

    let actualCases = 0;
    let actualRevenue = 0;

    sales.forEach(sale => {
      actualRevenue += (sale.netTotal || 0);
      sale.items?.forEach(item => {
        actualCases += (item.quantity || 0);
      });
    });

    const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const todayDate = now.getDate();
    const daysElapsed = Math.max(1, todayDate);
    const daysRemaining = Math.max(1, daysInMonth - todayDate + 1);

    const casesProgressPct = target.targetCases > 0
      ? Math.min(100, Math.round((actualCases / target.targetCases) * 100))
      : 0;

    const revenueProgressPct = target.targetRevenue > 0
      ? Math.min(100, Math.round((actualRevenue / target.targetRevenue) * 100))
      : 0;

    const currentDailyCasesAvg = actualCases / daysElapsed;
    const targetDailyCasesPace = target.targetCases / daysInMonth;
    const remainingCasesToTarget = Math.max(0, target.targetCases - actualCases);
    const requiredDailyCasesPace = remainingCasesToTarget > 0 ? (remainingCasesToTarget / daysRemaining) : 0;
    const projectedCasesEndMonth = Math.round(currentDailyCasesAvg * daysInMonth);

    let pacingStatus = 'ON_TRACK';
    if (actualCases >= target.targetCases) {
      pacingStatus = 'TARGET_ACHIEVED';
    } else if (currentDailyCasesAvg >= targetDailyCasesPace) {
      pacingStatus = 'ON_TRACK';
    } else {
      pacingStatus = 'BEHIND_TARGET';
    }

    res.json({
      target,
      actualCases,
      actualRevenue,
      casesProgressPct,
      revenueProgressPct,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      currentDailyCasesAvg: Math.round(currentDailyCasesAvg * 10) / 10,
      requiredDailyCasesPace: Math.round(requiredDailyCasesPace * 10) / 10,
      projectedCasesEndMonth,
      pacingStatus
    });
  } catch (err) {
    console.error('Error fetching target stats:', err);
    res.status(500).json({ message: 'Failed to fetch target progress' });
  }
};

// @desc    Set or Update Target for a Month
// @route   POST /api/targets
const setMonthTarget = async (req, res) => {
  try {
    const { month, targetCases, targetRevenue, notes } = req.body;

    const now = new Date();
    const defaultMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = month || defaultMonthStr;

    const updatedTarget = await Target.findOneAndUpdate(
      { month: targetMonth },
      {
        $set: {
          targetCases: Number(targetCases) || 5000,
          targetRevenue: Number(targetRevenue) || 2500000,
          notes: notes || ''
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Monthly sales target saved successfully!',
      target: updatedTarget
    });
  } catch (err) {
    console.error('Error saving target:', err);
    res.status(500).json({ message: 'Failed to save sales target' });
  }
};

module.exports = {
  getCurrentTarget,
  setMonthTarget
};
