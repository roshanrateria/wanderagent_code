import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { routeApiCall } from '@/lib/offline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface BudgetAnalysis {
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  categoryBreakdown: Record<string, number>;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  insights: string[];
  warnings: string[];
}

export default function BudgetTracker() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', description: '' });
  const [budget, setBudget] = useState(1000);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('wanderagent-budget');
    if (saved) {
      const data = JSON.parse(saved);
      setExpenses(data.expenses || []);
      setBudget(data.budget || 1000);
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('wanderagent-budget', JSON.stringify({ expenses, budget }));
  }, [expenses, budget]);

  const addExpense = () => {
    if (!newExpense.category || !newExpense.amount) return;
    const expense: Expense = {
      id: Date.now().toString(),
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      date: new Date().toISOString().split('T')[0]
    };
    setExpenses(prev => [...prev, expense]);
    setNewExpense({ category: '', amount: '', description: '' });
  };
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget - totalSpent;

  // Auto-analyze when expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      analyzeSpending();
    }
  }, [expenses, budget]);

  const analyzeSpending = async () => {
    if (expenses.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const response = await routeApiCall('POST', '/api/budget/analyze', {
        expenses,
        totalBudget: budget
      });
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        
        // Show warnings as toasts
        if (data.analysis.warnings && data.analysis.warnings.length > 0) {
          data.analysis.warnings.forEach((warning: string) => {
            toast({
              title: "Budget Alert",
              description: warning,
              variant: warning.includes('over budget') ? 'destructive' : 'default'
            });
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing spending:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateTips = async () => {
    if (expenses.length === 0) {
      toast({
        title: "No Expenses",
        description: "Add some expenses first to get personalized tips",
        variant: "default"
      });
      return;
    }

    setIsGeneratingTips(true);
    try {
      const response = await routeApiCall('POST', '/api/budget/recommendations', {
        expenses,
        totalBudget: budget,
        preferences: {
          remainingDays: 3 // Could be dynamic
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
        toast({
          title: "Tips Generated!",
          description: `Got ${data.recommendations.tips.length} money-saving tips for you`,
        });
      }
    } catch (error) {
      console.error('Error generating tips:', error);
      toast({
        title: "Error",
        description: "Failed to generate tips. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTips(false);
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    toast({
      title: "Expense Deleted",
      description: "Expense removed from tracker",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
        >
          <i className="fas fa-wallet text-green-500 mr-2"></i>
          <span className="font-medium">Budget Tracker</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Budget Tracker</DialogTitle>
        </DialogHeader>        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💰 Budget Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Budget:</span>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  placeholder="Enter budget"
                  className="w-32"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Total Spent:</span>
                <span className="font-bold">${totalSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Remaining:</span>
                <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ${remaining.toFixed(2)}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Used</span>
                  <span>{analysis?.percentageUsed.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(100, analysis?.percentageUsed || 0)} 
                  className={analysis && analysis.percentageUsed > 90 ? 'bg-red-100' : ''}
                />
              </div>

              {/* AI Insights */}
              {analysis && analysis.insights.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">💡 AI Insights</h4>
                  <ul className="space-y-1">
                    {analysis.insights.map((insight, idx) => (
                      <li key={idx} className="text-xs text-gray-700">• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Category Breakdown */}
              {analysis && analysis.topCategories.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">Top Spending Categories</h4>
                  <div className="space-y-2">
                    {analysis.topCategories.slice(0, 3).map((cat) => (
                      <div key={cat.category} className="flex justify-between text-sm">
                        <span>{cat.category}</span>
                        <span className="font-medium">${cat.amount.toFixed(2)} ({cat.percentage.toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Category (e.g., Food, Transport)"
                value={newExpense.category}
                onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              />
              <Input
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              />
              <Button onClick={addExpense}>Add Expense</Button>
            </CardContent>
          </Card>          <Card>
            <CardHeader>
              <CardTitle>📝 Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No expenses yet. Add your first expense above!</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expenses.slice().reverse().slice(0, 10).map(exp => (
                    <div key={exp.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{exp.category}</div>
                        <div className="text-xs text-gray-500">{exp.description}</div>
                        <div className="text-xs text-gray-400">{exp.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">${exp.amount.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(exp.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎯 AI Money-Saving Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={generateTips} 
                disabled={isGeneratingTips || expenses.length === 0}
                className="w-full"
              >
                {isGeneratingTips ? '🤖 Analyzing your spending...' : '💡 Get Personalized Tips'}
              </Button>
              
              {recommendations && (
                <>
                  {/* Main Tips */}
                  {recommendations.tips && recommendations.tips.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">💡 Smart Saving Tips</h4>
                      <ul className="space-y-1">
                        {recommendations.tips.map((tip: string, index: number) => (
                          <li key={index} className="text-sm">✓ {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Saving Opportunities */}
                  {recommendations.savingOpportunities && recommendations.savingOpportunities.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">🎯 Saving Opportunities</h4>
                      <ul className="space-y-1">
                        {recommendations.savingOpportunities.map((opp: string, index: number) => (
                          <li key={index} className="text-sm">💰 {opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Estimated Savings */}
                  {recommendations.estimatedSavings > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-sm font-semibold">
                        Potential Savings: <span className="text-purple-600 text-lg">${recommendations.estimatedSavings}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
