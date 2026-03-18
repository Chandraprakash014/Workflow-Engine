<template>
  <div class="app-container">
    <header>
      <h1>Workflow Automation Engine</h1>
      <nav class="main-nav">
        <router-link to="/">Dashboard</router-link>
        <router-link to="/audit">Audit Log</router-link>
      </nav>
    </header>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f4f7f6;
  color: #333;
}
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
header h1 {
  margin: 0;
  font-size: 1.5rem;
}
.main-nav {
  display: flex;
  gap: 1.5rem;
}
.main-nav a {
  color: #bdc3c7;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.main-nav a:hover, .main-nav a.router-link-active {
  color: white;
}
main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
</style>
