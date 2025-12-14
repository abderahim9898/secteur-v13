import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Edit3, Check } from 'lucide-react';
import { initialMotifTranslations } from '@/shared/motifs';

export default function AdminMotifs() {
  const { isSuperAdmin } = useAuth();
  const { data: motifs = [], loading, addDocument, updateDocument, deleteDocument, refetch } = useFirestore('motifs');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    // Seed the motifs collection if empty (only for first time)
    if (!loading && motifs.length === 0) {
      (async () => {
        try {
          const entries = Object.entries(initialMotifTranslations);
          for (const [key, label] of entries) {
            await addDocument({ key, label });
          }
          await refetch();
        } catch (err) {
          console.error('Failed to seed motifs:', err);
        }
      })();
    }
  }, [loading, motifs.length]);

  const handleAdd = async () => {
    const key = (newKey || '').trim();
    const label = (newLabel || '').trim();
    if (!key || !label) return;
    try {
      await addDocument({ key, label });
      setNewKey(''); setNewLabel('');
    } catch (err) {
      console.error('Add motif error', err);
    }
  };

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
  };

  const saveEdit = async (id: string) => {
    try {
      await updateDocument(id, { label: editingLabel });
      setEditingId(null);
      setEditingLabel('');
    } catch (err) {
      console.error('Update motif error', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
    } catch (err) {
      console.error('Delete motif error', err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout title="Gestion des motifs de sortie">
        <Card>
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            Seuls les super administrateurs peuvent gérer les motifs de sortie.
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestion des motifs de sortie">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ajouter un motif</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="clé (ex: demission)" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <Input placeholder="Libellé (ex: Démission)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <Button onClick={handleAdd} className="flex items-center"><Plus className="mr-2 h-4 w-4"/>Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motifs existants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clé</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motifs.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.key}</TableCell>
                  <TableCell>
                    {editingId === m.id ? (
                      <div className="flex gap-2">
                        <Input value={editingLabel} onChange={e => setEditingLabel(e.target.value)} />
                        <Button onClick={() => saveEdit(m.id)} className="flex items-center"><Check className="h-4 w-4 mr-2"/>Save</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span>{m.label}</span>
                        <div className="ml-4 flex items-center gap-2">
                          <Button variant="ghost" onClick={() => startEdit(m.id, m.label)} className="p-1"><Edit3 className="h-4 w-4"/></Button>
                          <Button variant="destructive" onClick={() => handleDelete(m.id)} className="p-1"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">{m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleString() : ''}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
