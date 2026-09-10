import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Check, X, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Type-ahead patient picker for the booking and admission forms.
 *
 * Reception drives this at speed with a queue in front of them, so it is a proper
 * combobox: arrow keys move the highlight, Enter selects, Escape closes, and clicking
 * away dismisses. The previous version was mouse-only and had no way to close the
 * dropdown at all, which left it covering the fields underneath.
 *
 * `registerThen` ('appointment' | 'admit') names the task to return to after registering
 * someone who isn't on file yet, turning the empty result into a way forward.
 */
const PatientSearch = ({ onSelect, selectedPatientId, registerThen }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [highlight, setHighlight] = useState(0);
    const rootRef = useRef(null);

    useEffect(() => {
        if (searchTerm.length <= 2) { setResults([]); return; }
        const delay = setTimeout(async () => {
            try {
                const response = await axios.get(`/api/Patient?search=${encodeURIComponent(searchTerm)}`);
                if (response.data.Results) {
                    setResults(response.data.Results);
                    setShowResults(true);
                    setHighlight(0);
                }
            } catch (error) {
                console.error('Error searching patients:', error);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    // Hydrate the chip when a patient id arrives from the URL (booking straight after
    // registration, or from a patient's chart).
    useEffect(() => {
        if (selectedPatientId && !selectedPatient) {
            axios.get(`/api/Patient/${selectedPatientId}`)
                .then(res => { if (res.data.Results) setSelectedPatient(res.data.Results); })
                .catch(() => { });
        }
    }, [selectedPatientId, selectedPatient]);

    useEffect(() => {
        const onClickAway = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setShowResults(false);
        };
        document.addEventListener('mousedown', onClickAway);
        return () => document.removeEventListener('mousedown', onClickAway);
    }, []);

    const handleSelect = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm('');
        setResults([]);
        setShowResults(false);
        onSelect(patient.patientId);
    };

    const clearSelection = () => {
        setSelectedPatient(null);
        setSearchTerm('');
        onSelect('');
    };

    const onKeyDown = (e) => {
        if (!showResults || results.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(h => (h + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => (h - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect(results[highlight]);
        } else if (e.key === 'Escape') {
            setShowResults(false);
        }
    };

    const noMatches = showResults && results.length === 0 && searchTerm.length > 2;

    return (
        <div className="space-y-2" ref={rootRef}>
            <Label htmlFor="patient-search">Patient</Label>

            {selectedPatient ? (
                // Once chosen, show the person rather than a text field still holding their
                // name — it makes the committed selection unambiguous.
                <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-2.5">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px]">
                            {initials(`${selectedPatient.firstName} ${selectedPatient.lastName}`)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="tabular truncate text-xs text-muted-foreground">
                            {[selectedPatient.patientCode, selectedPatient.phoneNumber].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    <button
                        type="button"
                        onClick={clearSelection}
                        aria-label="Choose a different patient"
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="patient-search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => { if (results.length > 0) setShowResults(true); }}
                        onKeyDown={onKeyDown}
                        placeholder="Search name, mobile or code…"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={showResults}
                        aria-controls="patient-search-results"
                        className="pl-9"
                    />

                    {showResults && results.length > 0 && (
                        <ul
                            id="patient-search-results"
                            role="listbox"
                            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md scrollbar-thin"
                        >
                            {results.map((patient, i) => (
                                <li key={patient.patientId} role="option" aria-selected={i === highlight}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(patient)}
                                        onMouseEnter={() => setHighlight(i)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors',
                                            i === highlight && 'bg-accent',
                                        )}
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarFallback className="text-[10px]">
                                                {initials(`${patient.firstName} ${patient.lastName}`)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">
                                                {patient.firstName} {patient.lastName}
                                            </span>
                                            <span className="tabular block truncate text-xs text-muted-foreground">
                                                {[patient.patientCode, patient.phoneNumber].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {noMatches && (
                        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-4 text-center shadow-md">
                            <p className="text-sm text-muted-foreground">No patients match “{searchTerm}”.</p>
                            {/* A walk-in who isn't on file used to dead-end here: reception had to
                                abandon this form, register the patient elsewhere, come back and
                                search again. Registering from here returns to the same task with
                                the new patient already selected. */}
                            {registerThen && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => navigate(
                                        `/dashboard/patients/new?then=${registerThen}&q=${encodeURIComponent(searchTerm)}`,
                                    )}
                                >
                                    <UserPlus /> Register “{searchTerm}” as a new patient
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientSearch;
