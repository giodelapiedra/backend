const mongoose = require('mongoose');
const User = require('./models/User');

// Simulate the getTeamList function
const getTeamList = async () => {
  try {
    console.log('Supervisor requesting team list for incident reporting');

    // Get all teams and their members
    const teams = await User.find({
      role: 'team_leader',
      isActive: true
    })
    .select('firstName lastName email team managedTeams defaultTeam')
    .lean();

    console.log('Found team leaders:', teams.length);

    const teamList = [];
    
    for (const teamLeader of teams) {
      console.log('Processing team leader:', teamLeader.firstName, teamLeader.lastName);
      
      const teamMembers = await User.find({
        teamLeader: teamLeader._id,
        isActive: true
      })
      .select('firstName lastName email role team package')
      .lean();

      console.log('Found team members:', teamMembers.length);

      teamList.push({
        teamId: teamLeader._id,
        teamName: teamLeader.defaultTeam || teamLeader.team || `${teamLeader.firstName} ${teamLeader.lastName}'s Team`,
        teamLeader: {
          id: teamLeader._id,
          name: `${teamLeader.firstName} ${teamLeader.lastName}`,
          email: teamLeader.email
        },
        members: teamMembers.map(member => ({
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          team: member.team,
          package: member.package
        })),
        totalMembers: teamMembers.length
      });
    }

    console.log(`Retrieved ${teamList.length} teams with members`);
    
    teamList.forEach(team => {
      console.log('\nTeam:', team.teamName);
      console.log('- Leader:', team.teamLeader.name);
      console.log('- Members:', team.totalMembers);
    });

    return teamList;
  } catch (err) {
    console.error('Error:', err);
  }
};

mongoose.connect('mongodb://localhost:27017/occupational-rehab').then(async () => {
  console.log('Connected to database');
  await getTeamList();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});


