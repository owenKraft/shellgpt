import Mixpanel from 'mixpanel';

// Initialize Mixpanel with your project token
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN!);

// Helper function to track events
export const track = (eventName: string, properties?: Record<string, any>) => {
  try {
    mixpanel.track(eventName, {
      distinct_id: 'user',  // You can set a unique identifier for the user
      ...properties,
      $source: 'web'
    });
  } catch (error) {
    console.error('Mixpanel tracking error:', error);
  }
};

export const Analytics = {
  track
}; 