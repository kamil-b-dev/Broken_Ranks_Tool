import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentProvider, useEquipment } from './EquipmentContext';
import { server } from '../test/server';

const ContextProbe = () => {
    const { data, gameRules, loading, initialDataError } = useEquipment();

    if (loading) return <p>Ładowanie</p>;
    if (initialDataError) return <p role="alert">{initialDataError}</p>;
    return <p>{`${data.items.length}:${gameRules.maxDrifLevel}`}</p>;
};

describe('EquipmentProvider', () => {
    it('loads initial game data from the backend', async () => {
        server.use(
            http.get('http://localhost:8080/api/initial-data', () => HttpResponse.json({
                items: [{ id: 1 }],
                orbs: [],
                drifs: [],
                gameRules: { maxDrifLevel: 21 },
                dictionaries: {}
            }))
        );

        render(<EquipmentProvider><ContextProbe /></EquipmentProvider>);

        expect(screen.getByText('Ładowanie')).toBeInTheDocument();
        expect(await screen.findByText('1:21')).toBeInTheDocument();
    });

    it('exposes a backend error to the application', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        server.use(
            http.get('http://localhost:8080/api/initial-data', () => HttpResponse.json(
                { message: 'Dane gry są niedostępne.' },
                { status: 503 }
            ))
        );

        render(<EquipmentProvider><ContextProbe /></EquipmentProvider>);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Dane gry są niedostępne.');
        });
    });
});
