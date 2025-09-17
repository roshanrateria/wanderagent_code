import { Card, CardContent } from "@/components/ui/card";
import type { AgentStatus } from "@/lib/types";
import { Capacitor } from '@capacitor/core';
import { isLocalMode } from '@/lib/localApi';

interface AIAgentStatusProps {
  status: AgentStatus;
}

const statusSteps = [
  { id: 'analyzing', label: 'Analyzing your preferences', icon: 'fas fa-user-cog' },
  { id: 'searching', label: 'Discovering places nearby', icon: 'fas fa-search' },
  { id: 'optimizing', label: 'Optimizing route', icon: 'fas fa-route' },
  { id: 'complete', label: 'Finalizing itinerary', icon: 'fas fa-check' },
];

export default function AIAgentStatus({ status }: AIAgentStatusProps) {
  const currentStepIndex = statusSteps.findIndex(step => step.id === status.status);
  
  const isNativePlatform = (Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '')) as boolean;
  const isLocalNative = isLocalMode() || isNativePlatform;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 sm:p-8">
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary to-orange-500 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-pulse">
            <i className="fas fa-robot text-white text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {isLocalNative ? 'Your AI Agent is Exploring' : 'Your AI Agent is Working'}
          </h3>
          <p className="text-gray-600 mb-8">
            {isLocalNative 
              ? 'Discovering amazing places nearby and creating your perfect local itinerary...'
              : 'Creating the perfect itinerary based on your preferences...'
            }
          </p>
          
          {/* Progress Steps */}
          <div className="max-w-md mx-auto mb-8">
            <div className="space-y-4">
              {statusSteps.map((step, index) => {
                const isComplete = index < currentStepIndex || (index === currentStepIndex && status.status === 'complete');
                const isCurrent = index === currentStepIndex && status.status !== 'complete';
                const isPending = index > currentStepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div 
                      className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? 'bg-primary text-white animate-spin' : ''}
                        ${isPending ? 'bg-gray-300 text-gray-600' : ''}
                      `}
                    >
                      {isComplete ? (
                        <i className="fas fa-check"></i>
                      ) : isCurrent ? (
                        <i className="fas fa-cog"></i>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="ml-4 text-left">
                      <p className={`font-medium ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                        {step.label}
                      </p>
                      <p className={`text-sm ${
                        isComplete ? 'text-green-600' : 
                        isCurrent ? 'text-primary' : 
                        'text-gray-500'
                      }`}>
                        {isComplete ? 'Complete' : isCurrent ? 'In progress...' : 'Waiting...'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`border rounded-xl p-4 ${
              status.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm ${
                status.status === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>
                <i className={`mr-2 ${
                  status.status === 'error' ? 'fas fa-exclamation-triangle' : 
                  status.status === 'searching' ? 'fas fa-search' :
                  status.status === 'optimizing' ? 'fas fa-route' :
                  'fas fa-info-circle'
                }`}></i>
                {status.message}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
