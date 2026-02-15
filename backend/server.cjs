const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 4000);
const DB_PATH = path.join(__dirname, 'db.json');
const DEFAULT_COMPANY_IMAGE =
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80';
  let jobs = [
  { id: "1", title: "Frontend Intern", company: "Google", location: "Remote" },
  { id: "2", title: "Backend Developer", company: "Microsoft", location: "Bangalore" },
];


const send = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const loadDb = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const saveDb = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
const safeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    send(res, 400, { message: 'Invalid request' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      send(res, 200, { status: 'ok', service: 'jobnest-backend' });
      return;
    }
    // GET /api/jobs
if (req.method === 'GET' && pathname === '/api/jobs') {
  send(res, 200, jobs);
  return;
}


    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const db = loadDb();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = body.role === 'recruiter' ? 'recruiter' : 'student';

      if (!email || !password) {
        send(res, 400, { message: 'Email and password are required.' });
        return;
      }

      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        send(res, 409, { message: 'An account with this email already exists.' });
        return;
      }

      if (role === 'recruiter' && !String(body.companyName || '').trim()) {
        send(res, 400, { message: 'Company name is required for recruiters.' });
        return;
      }

      const user = {
        id: `usr-${Date.now()}`,
        name: body.name || email.split('@')[0],
        email,
        role,
        companyName: role === 'recruiter' ? String(body.companyName || '').trim() : '',
        companyImage: role === 'recruiter' ? body.companyImage || DEFAULT_COMPANY_IMAGE : '',
        password,
        bio: body.bio || '',
        skills: body.skills || '',
        resume: body.resume || null,
      };

      db.users.push(user);
      saveDb(db);
      send(res, 201, { user: safeUser(user) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const db = loadDb();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = body.role;
      const companyName = String(body.companyName || '').trim().toLowerCase();

      const match = db.users.find(
        (u) => u.email.toLowerCase() === email && u.password === password && u.role === role,
      );

      if (!match) {
        send(res, 401, { message: 'Invalid email, role, or password.' });
        return;
      }

      if (role === 'recruiter' && match.companyName.toLowerCase() !== companyName) {
        send(res, 401, { message: 'Recruiter login requires correct company name.' });
        return;
      }

      send(res, 200, { user: safeUser(match) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
      const body = await parseBody(req);
      const db = loadDb();
      const email = String(body.email || '').trim().toLowerCase();
      const newPassword = String(body.newPassword || '');

      const target = db.users.find((u) => u.email.toLowerCase() === email);
      if (!target) {
        send(res, 404, { message: 'No account found with that email.' });
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        send(res, 400, { message: 'New password must be at least 6 characters.' });
        return;
      }

      target.password = newPassword;
      saveDb(db);
      send(res, 200, { message: 'Password reset successful.' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/jobs') {
      const db = loadDb();
      send(res, 200, { jobs: db.jobs });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/jobs') {
      const body = await parseBody(req);
      const db = loadDb();
      const postedBy = String(body.postedBy || '').trim().toLowerCase();
      const recruiter = db.users.find((u) => u.email.toLowerCase() === postedBy && u.role === 'recruiter');

      if (!recruiter) {
        send(res, 403, { message: 'Only recruiter accounts can post jobs.' });
        return;
      }

      const required = ['title', 'location', 'salary', 'type', 'description'];
      const missing = required.find((field) => !String(body[field] || '').trim());
      if (missing) {
        send(res, 400, { message: `${missing} is required.` });
        return;
      }

      const job = {
        id: `job-${Date.now()}`,
        title: body.title,
        company: recruiter.companyName || body.company,
        companyImage: body.companyImage || recruiter.companyImage || '',
        location: body.location,
        salary: body.salary,
        type: body.type,
        description: body.description,
        industry: body.industry || 'Technology',
        companySize: body.companySize || '50-200 employees',
        founded: body.founded || '2018',
        website: body.website || '',
        companyOverview: body.companyOverview || '',
        benefits: Array.isArray(body.benefits) ? body.benefits : [],
        postedBy: recruiter.email,
        postedAt: new Date().toISOString().slice(0, 10),
      };

      db.jobs.unshift(job);
      saveDb(db);
      send(res, 201, { job });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/api/jobs/') && pathname.endsWith('/apply')) {
      const [, , , jobId] = pathname.split('/');
      const body = await parseBody(req);
      const db = loadDb();
      const applicantEmail = String(body.applicantEmail || '').trim().toLowerCase();
      const student = db.users.find((u) => u.email.toLowerCase() === applicantEmail && u.role === 'student');

      if (!student) {
        send(res, 403, { message: 'Only student accounts can apply.' });
        return;
      }

      const job = db.jobs.find((j) => j.id === jobId);
      if (!job) {
        send(res, 404, { message: 'Job not found.' });
        return;
      }

      const exists = db.applications.some((a) => a.jobId === jobId && a.applicantEmail === student.email);
      if (exists) {
        send(res, 409, { message: 'You already applied to this job.' });
        return;
      }

      const app = {
        id: `app-${Date.now()}`,
        jobId,
        applicantEmail: student.email,
        applicantName: student.name,
        status: 'Applied',
        appliedAt: new Date().toISOString().slice(0, 10),
      };

      db.applications.unshift(app);
      saveDb(db);
      send(res, 201, { application: app });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/applications') {
      const db = loadDb();
      const role = searchParams.get('role');
      const email = String(searchParams.get('email') || '').toLowerCase();

      if (role === 'student') {
        send(res, 200, { applications: db.applications.filter((a) => a.applicantEmail === email) });
        return;
      }

      if (role === 'recruiter') {
        const recruiterJobs = db.jobs.filter((j) => j.postedBy.toLowerCase() === email).map((j) => j.id);
        send(res, 200, { applications: db.applications.filter((a) => recruiterJobs.includes(a.jobId)) });
        return;
      }

      send(res, 400, { message: 'role query must be student or recruiter.' });
      return;
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/applications/')) {
      const [, , , appId] = pathname.split('/');
      const body = await parseBody(req);
      const db = loadDb();
      const target = db.applications.find((a) => a.id === appId);

      if (!target) {
        send(res, 404, { message: 'Application not found.' });
        return;
      }

      if (!['Applied', 'Interviewing', 'Offered', 'Rejected'].includes(body.status)) {
        send(res, 400, { message: 'Invalid status.' });
        return;
      }

      target.status = body.status;
      saveDb(db);
      send(res, 200, { application: target });
      return;
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/profile/')) {
      const [, , , encodedEmail] = pathname.split('/');
      const body = await parseBody(req);
      const email = decodeURIComponent(encodedEmail).toLowerCase();
      const db = loadDb();
      const user = db.users.find((u) => u.email.toLowerCase() === email);

      if (!user) {
        send(res, 404, { message: 'User not found.' });
        return;
      }

      const allowed = ['name', 'bio', 'skills', 'resume', 'companyImage', 'companyName'];
      allowed.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          user[field] = body[field];
        }
      });

      saveDb(db);
      send(res, 200, { user: safeUser(user) });
      return;
    }

    send(res, 404, { message: 'Route not found.' });
  } catch (err) {
    send(res, 500, { message: err.message || 'Server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`JobNest backend running on http://localhost:${PORT}`);
});
