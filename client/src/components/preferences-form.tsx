import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { INTEREST_OPTIONS, DURATION_OPTIONS, BUDGET_OPTIONS, DIETARY_OPTIONS, TRANSPORTATION_OPTIONS } from "@/lib/types";
import type { UserPreferences } from "@/lib/types";
import { Capacitor } from '@capacitor/core';
import { isLocalMode } from '@/lib/localApi';

const preferencesSchema = z.object({
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
  duration: z.string().min(1, "Please select duration"),
  budget: z.string().min(1, "Please select budget"),
  dietaryRestrictions: z.array(z.string()),
  transportation: z.string().min(1, "Please select transportation"),
});

interface PreferencesFormProps {
  onSubmit: (preferences: UserPreferences) => void;
  loading?: boolean;
}

export default function PreferencesForm({ onSubmit, loading }: PreferencesFormProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  const isNativePlatform = (Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '')) as boolean;
  const isLocalNative = isLocalMode() || isNativePlatform;
  // For mobile: exclude multi-day and flights, focus on local single-day experiences
  const durationOptions = isLocalNative ? DURATION_OPTIONS.filter(o => o.value !== 'multiple days') : DURATION_OPTIONS;

  const form = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      interests: [],
      duration: "",
      budget: "",
      dietaryRestrictions: [],
      transportation: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof preferencesSchema>) => {
    onSubmit(data);
  };

  const handleInterestChange = (interestId: string, checked: boolean) => {
    const newInterests = checked
      ? [...selectedInterests, interestId]
      : selectedInterests.filter(id => id !== interestId);
    
    setSelectedInterests(newInterests);
    form.setValue('interests', newInterests);
  };

  const handleDietaryChange = (dietaryId: string, checked: boolean) => {
    const newDietary = checked
      ? [...selectedDietary, dietaryId]
      : selectedDietary.filter(id => id !== dietaryId);
    
    setSelectedDietary(newDietary);
    form.setValue('dietaryRestrictions', newDietary);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center mb-6">
          <div className="bg-blue-50 p-3 rounded-full mr-4">
            <i className="fas fa-user-cog text-primary text-xl"></i>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Tell Us About Your Preferences</h3>
            <p className="text-gray-600">Help our AI create the perfect itinerary for you</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Interests Selection */}
            <FormField
              control={form.control}
              name="interests"
              render={() => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-heart text-red-500 mr-2"></i>
                    What interests you? (Select all that apply)
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {INTEREST_OPTIONS.map((interest) => (
                      <div key={interest.id}>
                        <Label 
                          className={`flex items-center p-3 border-2 rounded-xl cursor-pointer hover:border-primary transition-colors ${
                            selectedInterests.includes(interest.id) ? 'border-primary bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <Checkbox
                            checked={selectedInterests.includes(interest.id)}
                            onCheckedChange={(checked) => handleInterestChange(interest.id, checked as boolean)}
                            className="sr-only"
                          />
                          <i className={`${interest.icon} mr-2 text-primary`}></i>
                          <span className="text-sm font-medium">{interest.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time and Budget */}
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-900 flex items-center">
                      <i className="fas fa-clock text-orange-500 mr-2"></i>
                      How much time do you have?
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-4 text-base">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              
              {/* Mobile note about simplified experience */}
              {isLocalNative && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-blue-800 text-sm">
                    <i className="fas fa-mobile-alt mr-2"></i>
                    Mobile mode focuses on single-day local exploration without flights. Perfect for discovering nearby gems!
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold text-gray-900 flex items-center">
                      <i className="fas fa-wallet text-green-500 mr-2"></i>
                      Budget preference
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="p-4 text-base">
                          <SelectValue placeholder="Select budget" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUDGET_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dietary Restrictions */}
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={() => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-leaf text-green-500 mr-2"></i>
                    Dietary preferences or restrictions
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DIETARY_OPTIONS.map((dietary) => (
                      <Label key={dietary.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedDietary.includes(dietary.id)}
                          onCheckedChange={(checked) => handleDietaryChange(dietary.id, checked as boolean)}
                        />
                        <span className="text-sm">{dietary.label}</span>
                      </Label>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Transportation */}
            <FormField
              control={form.control}
              name="transportation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-car text-primary mr-2"></i>
                    Preferred transportation
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    >
                      {TRANSPORTATION_OPTIONS.map((transport) => (
                        <div key={transport.value}>
                          <Label 
                            className={`flex items-center p-3 border-2 rounded-xl cursor-pointer hover:border-primary transition-colors ${
                              field.value === transport.value ? 'border-primary bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <RadioGroupItem value={transport.value} className="sr-only" />
                            <i className={`${transport.icon} mr-2`}></i>
                            <span className="text-sm font-medium">{transport.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>
                    Generate My Itinerary
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
