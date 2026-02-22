import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { ProjectType, Status } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowRight, Check, ExternalLink, Loader2 } from 'lucide-react';

function randomId() {
  return `prj-${Math.random().toString(36).slice(2, 8)}`;
}

const stages = [
  { label: 'Project Setup', step: 1 },
  { label: 'Data Selection', step: 2 },
  { label: 'Progress', step: 3 },
] as const;

export function CreateProjectPage() {
  const navigate = useNavigate();
  const { addProject } = useAppContext();
  const [stage, setStage] = useState(1);
  const [schemaStatus, setSchemaStatus] = useState<Status>('Queued');
  const [schemaError, setSchemaError] = useState(false);

  // Stage 1 — Setup
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType[]>(['RWE']);
  const [lead, setLead] = useState('Anurag');
  const [teamMembers, setTeamMembers] = useState('Nida, Neha, Sonick');
  const [criteria, setCriteria] = useState('Migraine frequency ≥ 4/month; MMSE < 24; No prior brain surgery');
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Reviewer'>('Reviewer');

  // Stage 2 — Data selection
  const [indexName, setIndexName] = useState('');
  const [patientIdField, setPatientIdField] = useState('');
  const [keywords, setKeywords] = useState('');
  const [groupBy, setGroupBy] = useState<'ndid' | 'encounter'>('encounter');

  // Stage 3 — Progress
  const [fileStatus, setFileStatus] = useState<'pending' | 'ready' | 'error'>('pending');
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (stage !== 3 || schemaStatus !== 'Processing') return;
    const timer = setInterval(() => {
      setProgressPct((prev) => {
        if (schemaError && prev >= 60) {
          clearInterval(timer);
          setSchemaStatus('Failed');
          setFileStatus('error');
          return prev;
        }
        const next = Math.min(prev + 10, 100);
        if (next >= 100) {
          clearInterval(timer);
          setSchemaStatus('Done');
          setFileStatus('ready');
        }
        return next;
      });
    }, 400);
    return () => clearInterval(timer);
  }, [stage, schemaStatus, schemaError]);

  async function submit() {
    await addProject({
      id: randomId(),
      name: name.trim() || 'Untitled Neurology Project',
      types: type,
      lead,
      dataSource: indexName || 'Manual Upload',
      patientCount: 0,
      lastUpdated: 'Now',
      shared: !isPrivate,
      status: 'Active',
      stageProgress: 0,
      currentStage: 1,
      totalStages: 5,
      teamAvatars: [lead.slice(0, 2).toUpperCase()],
    });
    navigate('/projects/prj-01/criteria');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Stepper */}
      <div className="flex items-center gap-3">
        {stages.map((s, idx) => {
          const done = stage > s.step;
          const active = stage === s.step;
          return (
            <div key={s.step} className="flex items-center gap-3">
              {idx > 0 && <div className={`h-px w-10 rounded-full ${stage > idx ? 'bg-primary' : 'bg-border'}`} />}
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                    done
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : active
                        ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : s.step}
                </div>
                <span className={`text-sm ${active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage 1 — Project Setup */}
      {stage === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Project Setup</CardTitle>
            <CardDescription>Configure your RWE/RWD neurology validation project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Project name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Migraine Prophylaxis Cohort" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Type</label>
                <Select value={type[0]} onChange={(e) => setType([e.target.value as ProjectType])}>
                  <option value="RWE">RWE</option>
                  <option value="RWD">RWD</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Lead</label>
                <Select value={lead} onChange={(e) => setLead(e.target.value)}>
                  <option>Anurag</option>
                  <option>Nida</option>
                  <option>Neha</option>
                  <option>Sonick</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Team members</label>
              <Input value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} placeholder="Comma-separated names" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Criteria</label>
              <Textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={3} placeholder="Define inclusion/exclusion criteria" />
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate((e.target as HTMLInputElement).checked)}
                />
                <span className="text-sm font-semibold">Private project</span>
                <span className="text-xs text-muted-foreground">(only you can access)</span>
              </label>
            </div>
            {!isPrivate && (
              <div className="space-y-3">
                <label className="text-sm font-semibold">Sharing controls</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="Invite by email"
                    />
                  </div>
                  <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Reviewer')}>
                    <option>Admin</option>
                    <option>Reviewer</option>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStage(2)}>
                Next: Data Selection
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage 2 — Data Selection */}
      {stage === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Data Selection</CardTitle>
            <CardDescription>Configure data sources and formatting for neurology records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Index name</label>
              <Input value={indexName} onChange={(e) => setIndexName(e.target.value)} placeholder="e.g. migraine_patients_index" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Patient ID field</label>
              <Input value={patientIdField} onChange={(e) => setPatientIdField(e.target.value)} placeholder="patient_id" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Keywords</label>
              <Textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="migraine, aura, triptan, prophylaxis, CGRP, headache days..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Grouping strategy</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30">
                  <input
                    type="radio"
                    name="groupBy"
                    checked={groupBy === 'ndid'}
                    onChange={() => setGroupBy('ndid')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold">Group by NDID (Patient ID)</p>
                    <p className="text-xs text-muted-foreground">Club all encounters under patient</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30">
                  <input
                    type="radio"
                    name="groupBy"
                    checked={groupBy === 'encounter'}
                    onChange={() => setGroupBy('encounter')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold">Group by Encounter ID</p>
                    <p className="text-xs text-muted-foreground">Each encounter treated independently</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStage(1)}>Back</Button>
              <Button onClick={() => { setStage(3); setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSchemaError(false); }}>
                Create Schema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage 3 — Progress */}
      {stage === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Schema Progress</CardTitle>
            <CardDescription>Monitoring schema creation and data indexing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Status chips */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  schemaStatus === 'Done' ? 'success' : schemaStatus === 'Failed' ? 'destructive' : 'processing'
                }
              >
                {schemaStatus === 'Processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {schemaStatus}
              </Badge>
              <Badge variant="secondary">
                File: {fileStatus === 'ready' ? 'Ready' : fileStatus === 'error' ? 'Error' : 'Pending'}
              </Badge>
              {indexName && <Badge variant="secondary">Index: {indexName || 'N/A'}</Badge>}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Schema creation</span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} />
            </div>

            {/* Status message */}
            <div className={`rounded-xl border p-5 text-sm leading-relaxed ${
              schemaStatus === 'Failed'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-muted/30'
            }`}>
              {schemaStatus === 'Processing' && 'Preparing neurology data schema and indexing patient records...'}
              {schemaStatus === 'Done' && 'Schema created successfully. All patient records indexed and ready for validation.'}
              {schemaStatus === 'Failed' && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Schema creation failed</p>
                    <p className="mt-1">Source file corrupted or index configuration invalid. Check logs for details.</p>
                  </div>
                </div>
              )}
              {schemaStatus === 'Queued' && 'Waiting to start schema creation...'}
            </div>

            {/* Error state: retry + simulate error */}
            {schemaStatus === 'Failed' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSchemaError(false); }}
                >
                  Retry
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Logs
                </Button>
              </div>
            )}

            {schemaStatus === 'Processing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSchemaError(true)}
                className="text-destructive"
              >
                Simulate Error
              </Button>
            )}

            {/* Logs link */}
            {schemaStatus !== 'Failed' && (
              <button className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                <ExternalLink className="h-3 w-3" /> View processing logs
              </button>
            )}

            {/* Move to validation CTA */}
            {schemaStatus === 'Done' && (
              <div className="flex justify-end">
                <Button onClick={() => void submit()}>
                  Move ahead with Validation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
