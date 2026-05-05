import * as leaguesService from './leagues.service';
import { Request, Response } from 'express';

export function getAll(req: Request, res: Response) {
  const leagues = leaguesService.getAllLeagues();
  res.json({ data: leagues });
}

export function getLeagueById(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  const league = leaguesService.getLeagueById(id);
  if (!league) {
    res.status(404).json({ error: 'League not found' });
  } else {
    res.json({ data: league });
  }
}

export function createLeague(req: Request, res: Response) {
  const data = req.body;
  const newLeague = leaguesService.createLeague(data);
  res.status(201).json({ data: newLeague });
}

export function updateLeague(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  const data = req.body;
  const updatedLeague = leaguesService.updateLeague(id, data);
  if (!updatedLeague) {
    res.status(404).json({ error: 'League not found' });
  } else {
    res.json({ data: updatedLeague });
  }
}

export function deleteLeague(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  const success = leaguesService.deleteLeague(id);
  if (!success) {
    res.status(404).json({ error: 'League not found' });
  } else {
    res.status(204).send();
  }
}
