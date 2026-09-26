import React from 'react';
import ExperienceDashboard from './ExperienceDashboard';

export default function DeveloperDashboardScreen({ navigation }) {
  return <ExperienceDashboard navigation={navigation} route={{ params: { legacyDeveloperDashboard: true } }} />;
}
