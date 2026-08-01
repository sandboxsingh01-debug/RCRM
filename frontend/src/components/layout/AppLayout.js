import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem, Divider,
  Badge, Tooltip, useMediaQuery, createTheme, ThemeProvider, CssBaseline
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SchoolIcon from '@mui/icons-material/School';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <DashboardIcon />,          roles: ['super_admin','sales_user','support_user'] },
  { label: 'Leads',        path: '/leads',        icon: <PersonSearchIcon />,        roles: ['super_admin','sales_user'] },
  { label: 'Prospects',    path: '/prospects',    icon: <PeopleIcon />,              roles: ['super_admin','sales_user'] },
  { label: 'Customers',    path: '/customers',    icon: <BusinessIcon />,            roles: ['super_admin','sales_user','support_user'] },
  { label: 'Tickets',      path: '/tickets',      icon: <ConfirmationNumberIcon />,  roles: ['super_admin','sales_user','support_user'] },
  { label: 'Training',     path: '/training',     icon: <SchoolIcon />,             roles: ['super_admin','support_user'] },
  { label: 'Transactions', path: '/transactions', icon: <ReceiptLongIcon />,         roles: ['super_admin'] },
  { label: 'Reports',      path: '/reports',      icon: <BarChartIcon />,            roles: ['super_admin'] },
  { label: 'Settings',     path: '/settings',     icon: <SettingsIcon />,            roles: ['super_admin'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:768px)');

  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode]     = useState(false);
  const [anchorEl, setAnchorEl]     = useState(null);

  const theme = createTheme({ palette: { mode: darkMode ? 'dark' : 'light', primary: { main: '#1976d2' } } });

  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" fontWeight="bold">CRM System</Typography>
        <Typography variant="caption">{user?.role?.replace('_', ' ').toUpperCase()}</Typography>
      </Box>
      <List sx={{ flex: 1, pt: 1 }}>
        {filteredNav.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{ '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit', minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <ListItemButton onClick={handleLogout} sx={{ m: 1 }}>
        <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
        <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
      </ListItemButton>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar desktop */}
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          sx={{ width: DRAWER_WIDTH, flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {drawer}
        </Drawer>

        {/* Main content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppBar position="static" elevation={1} color="default">
            <Toolbar>
              {isMobile && (
                <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" sx={{ flex: 1 }}>
                {filteredNav.find(n => n.path === location.pathname)?.label || 'CRM'}
              </Typography>

              <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
                <IconButton onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title={user?.full_name}>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                    {user?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled>
                  <Typography variant="body2">{user?.full_name}</Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1 }} />Logout</MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ flex: 1, p: { xs: 1, sm: 2, md: 3 }, overflow: 'auto' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
