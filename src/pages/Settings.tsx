import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Percent, Save } from 'lucide-react';

const Settings = () => {
  const { state, updateTaxSettings } = usePOS();
  const [taxEnabled, setTaxEnabled] = useState(state.taxSettings.enabled);
  const [taxRate, setTaxRate] = useState(state.taxSettings.rate.toString());
  const [taxName, setTaxName] = useState(state.taxSettings.name);

  const handleSaveTaxSettings = () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return;
    }

    updateTaxSettings({
      enabled: taxEnabled,
      rate,
      name: taxName.trim() || 'Sales Tax'
    });
  };

  const isFormValid = () => {
    const rate = parseFloat(taxRate);
    return !isNaN(rate) && rate >= 0 && rate <= 100 && taxName.trim().length > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/10 p-3 rounded-full">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your POS system preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Percent className="h-5 w-5 text-primary" />
              <span>Tax Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="tax-enabled" className="text-base font-medium">
                  Enable Tax Calculation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically add tax to all sales transactions
                </p>
              </div>
              <Switch
                id="tax-enabled"
                checked={taxEnabled}
                onCheckedChange={setTaxEnabled}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label htmlFor="tax-name">Tax Name</Label>
                <Input
                  id="tax-name"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g., Sales Tax, VAT, GST"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0.00"
                    className="pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the tax percentage (e.g., 8.5 for 8.5%)
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Current Tax Preview</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={taxEnabled ? "text-success" : "text-muted-foreground"}>
                    {taxEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Name:</span>
                  <span>{taxName || 'Sales Tax'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Rate:</span>
                  <span>{parseFloat(taxRate || '0').toFixed(2)}%</span>
                </div>
                {taxEnabled && (
                  <div className="flex justify-between border-t border-border pt-1 mt-2">
                    <span>Example on $100.00:</span>
                    <span className="font-medium">
                      ${(100 + (100 * (parseFloat(taxRate || '0') / 100))).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveTaxSettings}
              disabled={!isFormValid()}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Tax Settings
            </Button>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Products:</span>
                <span className="font-medium">{state.products.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Sales:</span>
                <span className="font-medium">{state.sales.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Current Tax Rate:</span>
                <span className="font-medium">{state.taxSettings.rate}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Tax Status:</span>
                <span className={`font-medium ${state.taxSettings.enabled ? 'text-success' : 'text-muted-foreground'}`}>
                  {state.taxSettings.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="bg-accent/10 p-4 rounded-lg">
              <h4 className="font-medium text-accent mb-2">Quick Stats</h4>
              <div className="text-sm space-y-1">
                <p>Low Stock Items: {state.products.filter(p => p.stock < 10).length}</p>
                <p>Out of Stock: {state.products.filter(p => p.stock === 0).length}</p>
                <p>Total Revenue: ${state.sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;