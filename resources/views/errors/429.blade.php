@extends('errors.layout')

@section('title', 'Too many requests')
@section('code', '429')
@section('message', 'You are doing that too often. Wait a moment and try again.')
