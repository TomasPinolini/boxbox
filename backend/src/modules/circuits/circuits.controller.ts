import { Request, Response } from 'express';
import * as circuitsService from './circuits.service';

export async function getAll(_req: Request, res: Response) {
  const circuits = await circuitsService.findAll();
  res.json({ data: circuits });
}

export async function getById(req: Request, res: Response) {
  const circuit = await circuitsService.findById(Number(req.params.id));
  res.json({ data: circuit });
}

export async function create(req: Request, res: Response) {
  const circuit = await circuitsService.create(req.body);
  res.status(201).json({ data: circuit });
}

export async function update(req: Request, res: Response) {
  const circuit = await circuitsService.update(Number(req.params.id), req.body);
  res.json({ data: circuit });
}

export async function remove(req: Request, res: Response) {
  await circuitsService.softDelete(Number(req.params.id));
  res.status(204).send();
}
