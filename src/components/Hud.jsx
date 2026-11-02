import A24Nav from './A24Nav.jsx';

export default function Hud({ route, navReturning, navRouteKey, activeKey, activePath, loading, onHome, onNavigate }) {
  // A closing project panel hands the navigation back before the route commits.
  const visible = route !== 'project' || navReturning;
  return (
    <A24Nav
      onHome={onHome}
      onNavigate={onNavigate}
      loading={loading}
      routeKey={navRouteKey}
      activeKey={activeKey}
      activePath={activePath}
      hidden={!visible}
    />
  );
}
