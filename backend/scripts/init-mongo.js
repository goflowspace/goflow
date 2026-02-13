// MongoDB initialization script
// This script creates a user and database for the Go Flow application

db = db.getSiblingDB('flow');

// Create application user
db.createUser({
  user: 'flowuser',
  pwd: 'flowpassword',
  roles: [
    {
      role: 'readWrite',
      db: 'flow'
    }
  ]
});

// Create collections if needed
db.createCollection('users');
db.createCollection('projects');
db.createCollection('teams');

print('MongoDB initialization completed for Go Flow application'); 