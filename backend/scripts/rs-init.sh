#!/bin/bash

echo "Waiting for MongoDB to start..."
sleep 10

echo "Initializing replica set..."
mongosh --host mongodb:27017 -u admin -p password123 --authenticationDatabase admin --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb:27017' }
  ]
})
"

echo "Waiting for replica set to become primary..."
sleep 10

echo "Checking replica set status..."
mongosh --host mongodb:27017 -u admin -p password123 --authenticationDatabase admin --eval "rs.status()"

echo "Replica set initialization completed!" 