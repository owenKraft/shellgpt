import Mixpanel from 'mixpanel';

// Initialize Mixpanel with your project token
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN!);

type EventProperties = {
  prompt?: string;
  timestamp: string;
  [key: string]: unknown;
};

// Helper function to track events
export const track = (eventName: string, properties: EventProperties) => {
  try {
    mixpanel.track(eventName, {
      distinct_id: 'user',
      ...properties,
      $source: 'web'
    });
  } catch (error: unknown) {
    console.error('Mixpanel tracking error:', error);
  }
};

export const Analytics = {
  track
}; 