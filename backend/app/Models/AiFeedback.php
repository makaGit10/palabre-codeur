<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

// Table « ai_feedback » (Laravel ne met pas « feedback » au pluriel)
#[Fillable(['user_id', 'value'])]
class AiFeedback extends Model {}
